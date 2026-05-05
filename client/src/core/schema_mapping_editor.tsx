import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import FormBody from "@templates/form-body";
import { FormFieldLabel } from "@templates/form-field-label";
import { fetchWithRetry } from "@/utils/api-fetch";

const DETAIL_ENDPOINT = "/api/core/schema/source-mappings/detail/";
const SAMPLE_ROWS_ENDPOINT = "/api/core/schema/source-mappings/sample-rows/";
const TEST_RUN_ENDPOINT = "/api/core/schema/source-mappings/test-run/";
const RUN_MAPPING_ENDPOINT = "/api/core/schema/source-mappings/run/";
const COLUMN_MAPPINGS_ENDPOINT = "/api/core/schema/column-mappings/";
const UNIT_TYPES_ENDPOINT = "/api/core/schema/unit-types/";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InferredRole = "timestamp" | "value" | "dimension" | "unmapped" | "skipped";

type FieldRow = {
  raw_column: string;
  column_mapping_id: number | null;
  is_mapped: boolean;
  semantic_key: string;
  unit_type_id: number | null;
  unit_type_name: string | null;
  column_label: string;
  notes: string;
  include_in_ingestion: boolean;
  inferred_role: InferredRole;
  suggested_semantic_key: string;
};

type UnitTypeRow = {
  unit_type_id: number;
  unit_name: string;
  base_data_type: string;
  description: string;
};

type SampleRow = {
  source_file_name: string;
  row_number: number;
  row_payload_json: Record<string, unknown>;
};

type MappingForm = {
  column_label: string;
  semantic_key: string;
  unit_type_id: number | null;
  notes: string;
  include_in_ingestion: boolean;
};

type UnitTypeForm = {
  unit_name: string;
  base_data_type: string;
  description: string;
};

type TestRunResult = {
  success: boolean;
  message: string;
  files_tested: number;
  raw_records_processed: number;
  timeseries_points_would_create: number;
  validation_warnings: string[];
  error_detail: string | null;
};

type RunMappingResult = {
  success: boolean;
  message: string;
  files_ran: number;
  attempted_points: number;
  inserted_points: number;
  duplicate_points_skipped: number;
  output: string;
  error_detail: string | null;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_DATA_TYPE_OPTIONS = ["float", "int", "bool", "string", "datetime"];

const ROLE_BADGE: Record<InferredRole, string> = {
  timestamp: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  value: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  dimension: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  unmapped: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  skipped: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

const ROLE_HELP_TEXT = [
  "Role types:",
  "timestamp = this column defines observation time",
  "value = primary measured value",
  "dimension = categorical attribute for grouping/filtering",
  "skipped = configured but excluded from ingestion",
  "unmapped = not mapped yet",
].join("\n");

const FIELD_HINT = {
  columnLabel: "Optional category label, such as zone, fuel_type, market, or node.",
  semanticKey: "Canonical snake_case field key used by downstream logic.",
  unitType: "Assign a unit type to mark this as value or timestamp based on base data type.",
  notes: "Free-form implementation notes for this mapping.",
  unitName: "Human-friendly name of the unit type (for example MW or datetime).",
  baseDataType: "Underlying data type used for role inference and validation.",
  description: "Optional description of how/when this unit type should be used.",
} as const;

function inferRole(row: Pick<FieldRow, "unit_type_id" | "unit_type_name" | "column_label" | "include_in_ingestion">): InferredRole {
  if (!row.include_in_ingestion) return "skipped";
  if (row.unit_type_id) {
    // unit_type_name format: "unit [base_data_type]"
    const isDatetime = row.unit_type_name?.includes("[datetime]");
    return isDatetime ? "timestamp" : "value";
  }
  if (row.column_label.trim()) return "dimension";
  return "unmapped";
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

function fetchJson<T>(url: string): Promise<T> {
  return fetchWithRetry(url).then((r) => r.json());
}

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const d = data as { items?: T[]; results?: T[] };
  return d.items ?? d.results ?? [];
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function SchemaMappingEditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceSystem = searchParams.get("source_system") ?? "";
  const datasetKey = searchParams.get("dataset_key") ?? "";

  // Field list state
  const [fieldRows, setFieldRows] = useState<FieldRow[]>([]);
  const [fieldLoading, setFieldLoading] = useState(false);
  const [selectedField, setSelectedField] = useState<FieldRow | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Sample data state
  const [sampleRows, setSampleRows] = useState<SampleRow[]>([]);
  const [sampleLoading, setSampleLoading] = useState(false);

  // Unit type registry state
  const [unitTypes, setUnitTypes] = useState<UnitTypeRow[]>([]);
  const [selectedUnitTypeId, setSelectedUnitTypeId] = useState<number | null>(null);
  const [unitTypeForm, setUnitTypeForm] = useState<UnitTypeForm>({ unit_name: "", base_data_type: "float", description: "" });
  const [unitTypeSaving, setUnitTypeSaving] = useState(false);

  // Column mapping form state
  const [mappingForm, setMappingForm] = useState<MappingForm>({ column_label: "", semantic_key: "", unit_type_id: null, notes: "", include_in_ingestion: true });
  const [mappingSaving, setMappingSaving] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);

  // Test run state
  const [testRunResult, setTestRunResult] = useState<TestRunResult | null>(null);
  const [testRunLoading, setTestRunLoading] = useState(false);
  const [runMappingResult, setRunMappingResult] = useState<RunMappingResult | null>(null);
  const [runMappingLoading, setRunMappingLoading] = useState(false);

  const selectedUnitType = useMemo(
    () => unitTypes.find((u) => u.unit_type_id === selectedUnitTypeId) ?? null,
    [unitTypes, selectedUnitTypeId]
  );

  // Load unit types
  const loadUnitTypes = useCallback(() => {
    fetchJson<unknown>(UNIT_TYPES_ENDPOINT)
      .then((data) => setUnitTypes(unwrapList<UnitTypeRow>(data)))
      .catch(() => {});
  }, []);

  useEffect(() => { loadUnitTypes(); }, [loadUnitTypes]);

  // Sync unit type form when selection changes
  useEffect(() => {
    if (selectedUnitType) {
      setUnitTypeForm({
        unit_name: selectedUnitType.unit_name,
        base_data_type: selectedUnitType.base_data_type,
        description: selectedUnitType.description,
      });
    } else {
      setUnitTypeForm({ unit_name: "", base_data_type: "float", description: "" });
    }
  }, [selectedUnitType]);

  // Load field rows
  useEffect(() => {
    if (!sourceSystem || !datasetKey) { setFieldRows([]); return; }
    const params = new URLSearchParams({ source_system: sourceSystem, dataset_key: datasetKey });
    setFieldLoading(true);
    fetchJson<unknown>(`${DETAIL_ENDPOINT}?${params}`)
      .then((data) => {
        const rows = unwrapList<FieldRow>(data);
        setFieldRows(rows);
        setSelectedField((cur) => rows.find((r) => r.raw_column === cur?.raw_column) ?? rows[0] ?? null);
      })
      .catch(() => setFieldRows([]))
      .finally(() => setFieldLoading(false));
  }, [sourceSystem, datasetKey, refreshTick]);

  // Load sample rows
  useEffect(() => {
    if (!sourceSystem || !datasetKey) { setSampleRows([]); return; }
    const params = new URLSearchParams({ source_system: sourceSystem, dataset_key: datasetKey, limit: "20" });
    setSampleLoading(true);
    fetchJson<unknown>(`${SAMPLE_ROWS_ENDPOINT}?${params}`)
      .then((data) => setSampleRows(unwrapList<SampleRow>(data)))
      .catch(() => setSampleRows([]))
      .finally(() => setSampleLoading(false));
  }, [sourceSystem, datasetKey]);

  // Sync mapping form when field selection changes
  useEffect(() => {
    if (!selectedField) return;
    setMappingForm({
      column_label: selectedField.column_label,
      semantic_key: selectedField.semantic_key || selectedField.suggested_semantic_key,
      unit_type_id: selectedField.unit_type_id,
      notes: selectedField.notes,
      include_in_ingestion: selectedField.include_in_ingestion,
    });
    setMappingError(null);
  }, [selectedField]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSaveMapping = async () => {
    if (!selectedField || !sourceSystem || !datasetKey) return;
    setMappingSaving(true);
    setMappingError(null);
    try {
      const body = {
        source_system: sourceSystem,
        dataset_key: datasetKey,
        raw_column: selectedField.raw_column,
        ...mappingForm,
      };
      const method = selectedField.column_mapping_id ? "PATCH" : "POST";
      const url = selectedField.column_mapping_id
        ? `${COLUMN_MAPPINGS_ENDPOINT}${selectedField.column_mapping_id}/`
        : COLUMN_MAPPINGS_ENDPOINT;
      const resp = await fetchWithRetry(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error(await resp.text());
      setRefreshTick((t) => t + 1);
    } catch (e) {
      setMappingError(String(e));
    } finally {
      setMappingSaving(false);
    }
  };

  const handleDeleteMapping = async () => {
    if (!selectedField?.column_mapping_id) return;
    if (!confirm("Delete this column mapping?")) return;
    try {
      await fetchWithRetry(`${COLUMN_MAPPINGS_ENDPOINT}${selectedField.column_mapping_id}/`, { method: "DELETE" });
      setRefreshTick((t) => t + 1);
    } catch {}
  };

  const handleSaveUnitType = async () => {
    setUnitTypeSaving(true);
    try {
      const method = selectedUnitTypeId ? "PATCH" : "POST";
      const url = selectedUnitTypeId ? `${UNIT_TYPES_ENDPOINT}${selectedUnitTypeId}/` : UNIT_TYPES_ENDPOINT;
      const resp = await fetchWithRetry(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unitTypeForm),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const saved: UnitTypeRow = await resp.json();
      loadUnitTypes();
      setSelectedUnitTypeId(saved.unit_type_id);
    } finally {
      setUnitTypeSaving(false);
    }
  };

  const handleDeleteUnitType = async () => {
    if (!selectedUnitTypeId) return;
    if (!confirm("Delete this unit type? Any column mappings using it will have their unit type cleared.")) return;
    await fetchWithRetry(`${UNIT_TYPES_ENDPOINT}${selectedUnitTypeId}/`, { method: "DELETE" });
    loadUnitTypes();
    setSelectedUnitTypeId(null);
  };

  const handleAddUnitType = () => {
    setSelectedUnitTypeId(null);
    setUnitTypeForm({ unit_name: "", base_data_type: "float", description: "" });
  };

  const handleTestRun = async () => {
    if (!sourceSystem || !datasetKey) return;
    setTestRunLoading(true);
    try {
      const params = new URLSearchParams({
        source_system: sourceSystem,
        dataset_key: datasetKey,
      });
      const resp = await fetchWithRetry(`${TEST_RUN_ENDPOINT}?${params}`, {
        method: "POST",
      });
      if (!resp.ok) throw new Error(await resp.text());
      const result: TestRunResult = await resp.json();
      setTestRunResult(result);
    } catch (e) {
      setTestRunResult({
        success: false,
        message: `Error running test: ${String(e)}`,
        files_tested: 0,
        raw_records_processed: 0,
        timeseries_points_would_create: 0,
        validation_warnings: [],
        error_detail: String(e),
      });
    } finally {
      setTestRunLoading(false);
    }
  };

  const handleRunMapping = async () => {
    if (!sourceSystem || !datasetKey) return;
    setRunMappingLoading(true);
    try {
      const params = new URLSearchParams({
        source_system: sourceSystem,
        dataset_key: datasetKey,
      });
      const resp = await fetchWithRetry(`${RUN_MAPPING_ENDPOINT}?${params}`, {
        method: "POST",
      });
      if (!resp.ok) throw new Error(await resp.text());
      const result: RunMappingResult = await resp.json();
      setRunMappingResult(result);
    } catch (e) {
      setRunMappingResult({
        success: false,
        message: `Error running mapping: ${String(e)}`,
        files_ran: 0,
        attempted_points: 0,
        inserted_points: 0,
        duplicate_points_skipped: 0,
        output: "",
        error_detail: String(e),
      });
    } finally {
      setRunMappingLoading(false);
    }
  };

  const mappingUnitTypeName = useMemo(() => {
    if (!mappingForm.unit_type_id) return null;
    const selected = unitTypes.find((u) => u.unit_type_id === mappingForm.unit_type_id);
    return selected ? `${selected.unit_name} [${selected.base_data_type}]` : null;
  }, [unitTypes, mappingForm.unit_type_id]);

  const previewRole = useMemo<InferredRole>(() => {
    if (!selectedField) return "unmapped";
    return inferRole({ ...selectedField, ...mappingForm, unit_type_name: mappingUnitTypeName });
  }, [selectedField, mappingForm, mappingUnitTypeName]);

  const mappedCount = useMemo(() => fieldRows.filter((r) => r.is_mapped).length, [fieldRows]);

  // ---------------------------------------------------------------------------
  // Guard
  // ---------------------------------------------------------------------------

  if (!sourceSystem || !datasetKey) {
    return (
      <FormBody title="Source Mapping Editor" subtitle="Open this page from a source mapping row.">
        <button
          type="button"
          className="mb-3 inline-flex items-center gap-2 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          onClick={() => navigate("/core/schema-mappings")}
        >
          &lt;- Back
        </button>
        <p className="text-sm text-slate-500 dark:text-slate-400">Missing source information. Select a row from the Source Mapping list.</p>
      </FormBody>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <FormBody
      title="Source Mapping Editor"
      subtitle={`${sourceSystem} / ${datasetKey} - map each raw column to a semantic key and unit type.`}
    >
      {/* Back + header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          onClick={() => navigate("/core/schema-mappings")}
        >
          &lt;- Back
        </button>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {mappedCount} of {fieldRows.length} field{fieldRows.length !== 1 ? "s" : ""} mapped
        </p>
        <button type="button" className="btn-secondary" onClick={() => setRefreshTick((t) => t + 1)}>
          Refresh
        </button>
      </div>

      {/* Fields table */}
      <div className="mb-5 overflow-auto rounded border border-slate-200 dark:border-slate-700">
        <table className="w-full table-auto border-collapse text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Raw Column</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Semantic Key</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Column Label</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Unit Type</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">
                <FormFieldLabel
                  label="Role"
                  hintInfo="Role meanings: timestamp = time axis, value = measured value, dimension = category, skipped = excluded from ingestion, unmapped = not configured."
                  className="mb-0 inline-flex items-center text-sm font-medium text-slate-700 dark:text-slate-300"
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {fieldLoading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
            )}
            {!fieldLoading && fieldRows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">No raw fields found for this dataset.</td></tr>
            )}
            {!fieldLoading && fieldRows.map((row) => {
              const active = selectedField?.raw_column === row.raw_column;
              const role = inferRole(row);
              return (
                <tr
                  key={row.raw_column}
                  onClick={() => setSelectedField(row)}
                  className={[
                    "cursor-pointer border-t border-slate-100 dark:border-slate-800",
                    active ? "bg-sky-50 dark:bg-sky-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                  ].join(" ")}
                >
                  <td className="px-4 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">{row.raw_column}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-600 dark:text-slate-400">{row.semantic_key || <span className="italic text-slate-400">-</span>}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{row.column_label || <span className="italic text-slate-400">-</span>}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{row.unit_type_name || <span className="italic text-slate-400">-</span>}</td>
                  <td className="px-4 py-2">
                    <div className="inline-flex items-center gap-1">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${ROLE_BADGE[role]}`}>
                        {role}
                      </span>
                      <FormFieldLabel
                        label=""
                        hintInfo={ROLE_HELP_TEXT}
                        className="mb-0 inline-flex items-center"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3-panel editor */}
      {selectedField && (
        <>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">

          {/* Panel 1 - Sample Data */}
          <div className="rounded border border-slate-200 p-4 dark:border-slate-700">
            <h3 className="mb-2 text-base font-semibold">Sample Data</h3>
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
              Values for <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{selectedField.raw_column}</span>
            </p>
            <div className="max-h-112 overflow-auto rounded border border-slate-200 dark:border-slate-700">
              <table className="w-full table-auto border-collapse text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">File</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Row</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleLoading && (
                    <tr><td colSpan={3} className="px-3 py-4 text-center text-slate-500">Loading...</td></tr>
                  )}
                  {!sampleLoading && sampleRows.length === 0 && (
                    <tr><td colSpan={3} className="px-3 py-4 text-center text-slate-500">No sample rows available.</td></tr>
                  )}
                  {!sampleLoading && sampleRows.map((s, i) => {
                    const val = s.row_payload_json[selectedField.raw_column];
                    const display = val == null ? "-" : typeof val === "object" ? JSON.stringify(val) : String(val);
                    return (
                      <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">{s.source_file_name}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{s.row_number}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">{display}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Panel 2 - Column Mapping Editor */}
          <div className="rounded border border-slate-200 p-4 dark:border-slate-700">
            <h3 className="mb-2 text-base font-semibold">Column Mapping</h3>
            <div className="mb-3 flex items-center gap-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedField.column_mapping_id ? "Editing existing mapping." : "No mapping yet - will create on save."}
              </p>
              <div className="ml-auto inline-flex items-center gap-1">
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${ROLE_BADGE[previewRole]}`}
                >
                  {previewRole}
                </span>
                <FormFieldLabel
                  label=""
                  hintInfo={ROLE_HELP_TEXT}
                  className="mb-0 inline-flex items-center"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="block">
                <FormFieldLabel label="Column Label" hintInfo={FIELD_HINT.columnLabel} htmlFor="mapping-column-label" />
                <input
                  id="mapping-column-label"
                  className="form-input"
                  placeholder="zone, fuel_type, market, node"
                  value={mappingForm.column_label}
                  onChange={(e) => setMappingForm((f) => ({ ...f, column_label: e.target.value }))}
                />
              </div>

              <div className="block">
                <FormFieldLabel label="Semantic Key" hintInfo={FIELD_HINT.semanticKey} htmlFor="mapping-semantic-key" />
                <input
                  id="mapping-semantic-key"
                  className="form-input font-mono"
                  placeholder={selectedField.suggested_semantic_key}
                  value={mappingForm.semantic_key}
                  onChange={(e) => setMappingForm((f) => ({ ...f, semantic_key: e.target.value }))}
                />
              </div>

              <div className="block">
                <div className="mb-1 flex flex-wrap items-center gap-1">
                  <FormFieldLabel label="Unit Type" hintInfo={FIELD_HINT.unitType} htmlFor="mapping-unit-type" className="mb-0 text-sm font-medium text-slate-700 dark:text-slate-300" />
                  <span className="text-xs font-normal text-slate-400 dark:text-slate-500">- infers value or timestamp role</span>
                </div>
                <select
                  id="mapping-unit-type"
                  className="form-input"
                  value={mappingForm.unit_type_id ?? ""}
                  onChange={(e) => setMappingForm((f) => ({ ...f, unit_type_id: e.target.value ? Number(e.target.value) : null }))}
                >
                  <option value="">- none -</option>
                  {unitTypes.map((u) => (
                    <option key={u.unit_type_id} value={u.unit_type_id}>
                      {u.unit_name} [{u.base_data_type}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="block">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={mappingForm.include_in_ingestion}
                    onChange={(e) => setMappingForm((f) => ({ ...f, include_in_ingestion: e.target.checked }))}
                  />
                  Include In Ingestion
                </label>
              </div>

              <div className="block">
                <FormFieldLabel label="Notes" hintInfo={FIELD_HINT.notes} htmlFor="mapping-notes" />
                <textarea
                  id="mapping-notes"
                  className="form-input"
                  rows={3}
                  value={mappingForm.notes}
                  onChange={(e) => setMappingForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            {mappingError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{mappingError}</p>
            )}

            <div className="mt-4 flex gap-2">
              <button type="button" className="btn-primary" onClick={handleSaveMapping} disabled={mappingSaving}>
                {mappingSaving ? "Saving..." : selectedField.column_mapping_id ? "Save Changes" : "Create Mapping"}
              </button>
              {selectedField.column_mapping_id && (
                <button type="button" className="btn-danger" onClick={handleDeleteMapping}>
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Panel 3 - Unit Type Registry */}
          <div className="rounded border border-slate-200 p-4 dark:border-slate-700">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold">Unit Type Registry</h3>
              <button type="button" className="btn-secondary" onClick={handleAddUnitType}>+ New</button>
            </div>

            <div className="mb-3 max-h-48 overflow-auto rounded border border-slate-200 dark:border-slate-700">
              <table className="w-full table-auto border-collapse text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Unit</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {unitTypes.length === 0 && (
                    <tr><td colSpan={2} className="px-3 py-4 text-center text-sm text-slate-500">No unit types yet.</td></tr>
                  )}
                  {unitTypes.map((u) => (
                    <tr
                      key={u.unit_type_id}
                      onClick={() => setSelectedUnitTypeId(u.unit_type_id)}
                      className={[
                        "cursor-pointer border-t border-slate-100 dark:border-slate-800",
                        selectedUnitTypeId === u.unit_type_id ? "bg-sky-50 dark:bg-sky-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                      ].join(" ")}
                    >
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{u.unit_name}</td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{u.base_data_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3">
              <div className="block">
                <FormFieldLabel label="Unit Name" hintInfo={FIELD_HINT.unitName} htmlFor="unit-type-name" />
                <input
                  id="unit-type-name"
                  className="form-input"
                  placeholder="MW, USD/MWh, datetime"
                  value={unitTypeForm.unit_name}
                  onChange={(e) => setUnitTypeForm((f) => ({ ...f, unit_name: e.target.value }))}
                />
              </div>

              <div className="block">
                <FormFieldLabel label="Base Data Type" hintInfo={FIELD_HINT.baseDataType} htmlFor="unit-base-data-type" />
                <select
                  id="unit-base-data-type"
                  className="form-input"
                  value={unitTypeForm.base_data_type}
                  onChange={(e) => setUnitTypeForm((f) => ({ ...f, base_data_type: e.target.value }))}
                >
                  {BASE_DATA_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="block">
                <FormFieldLabel label="Description" hintInfo={FIELD_HINT.description} htmlFor="unit-description" />
                <textarea
                  id="unit-description"
                  className="form-input"
                  rows={3}
                  value={unitTypeForm.description}
                  onChange={(e) => setUnitTypeForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button type="button" className="btn-primary" onClick={handleSaveUnitType} disabled={unitTypeSaving}>
                {unitTypeSaving ? "Saving..." : selectedUnitTypeId ? "Save Unit Type" : "Create Unit Type"}
              </button>
              {selectedUnitTypeId && (
                <button type="button" className="btn-danger" onClick={handleDeleteUnitType}>
                  Delete
                </button>
              )}
            </div>
          </div>

          </div>

          {/* Mapping Actions */}
          <div className="mt-5 rounded border border-slate-200 p-4 dark:border-slate-700">
            <h3 className="mb-3 text-base font-semibold">Mapping Actions</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={handleTestRun} disabled={testRunLoading || !fieldRows.length}>
                {testRunLoading ? "Testing..." : "Test Mapping"}
              </button>
              <button type="button" className="btn-primary" onClick={handleRunMapping} disabled={runMappingLoading || !fieldRows.length}>
                {runMappingLoading ? "Running..." : "Run Mapping"}
              </button>
            </div>

            {testRunResult && (
              <div className={`mt-4 rounded border p-4 ${testRunResult.success ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40"}`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className={`text-sm font-semibold ${testRunResult.success ? "text-emerald-900 dark:text-emerald-200" : "text-red-900 dark:text-red-200"}`}>
                    Test Results
                  </h4>
                  <button
                    type="button"
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    onClick={() => setTestRunResult(null)}
                  >
                    ✕
                  </button>
                </div>
                <div className={`mb-3 text-sm ${testRunResult.success ? "text-emerald-800 dark:text-emerald-300" : "text-red-800 dark:text-red-300"}`}>
                  {testRunResult.message}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="text-slate-700 dark:text-slate-300">
                    <span className="font-medium">Files Tested:</span> {testRunResult.files_tested}
                  </div>
                  <div className="text-slate-700 dark:text-slate-300">
                    <span className="font-medium">Raw Records:</span> {testRunResult.raw_records_processed}
                  </div>
                  <div className="text-slate-700 dark:text-slate-300">
                    <span className="font-medium">Timeseries Points:</span> {testRunResult.timeseries_points_would_create}
                  </div>
                  {testRunResult.validation_warnings.length > 0 && (
                    <div>
                      <span className="font-medium text-amber-700 dark:text-amber-300">Warnings:</span>
                      <ul className="ml-4 mt-1 list-disc space-y-1 text-amber-700 dark:text-amber-300">
                        {testRunResult.validation_warnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {testRunResult.error_detail && (
                    <div className="mt-2 rounded bg-red-100 p-2 font-mono text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                      {testRunResult.error_detail}
                    </div>
                  )}
                </div>
              </div>
            )}

            {runMappingResult && (
              <div className={`mt-4 rounded border p-4 ${runMappingResult.success ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40"}`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className={`text-sm font-semibold ${runMappingResult.success ? "text-emerald-900 dark:text-emerald-200" : "text-red-900 dark:text-red-200"}`}>
                    Run Output
                  </h4>
                  <button
                    type="button"
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    onClick={() => setRunMappingResult(null)}
                  >
                    ✕
                  </button>
                </div>
                <p className={`mb-2 text-sm ${runMappingResult.success ? "text-emerald-800 dark:text-emerald-300" : "text-red-800 dark:text-red-300"}`}>
                  {runMappingResult.message}
                </p>
                <div className="mb-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                  <p><span className="font-medium">Files Ran:</span> {runMappingResult.files_ran}</p>
                  <p><span className="font-medium">Attempted:</span> {runMappingResult.attempted_points}</p>
                  <p><span className="font-medium">Inserted:</span> {runMappingResult.inserted_points}</p>
                  <p><span className="font-medium">Duplicates Skipped:</span> {runMappingResult.duplicate_points_skipped}</p>
                </div>
                <div className="rounded bg-slate-100 p-2 font-mono text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {runMappingResult.output || "No output"}
                </div>
                {runMappingResult.error_detail && (
                  <div className="mt-2 rounded bg-red-100 p-2 font-mono text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {runMappingResult.error_detail}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </FormBody>
  );
}
