/**
 * Schema mapping editor page.
 * Three-panel interface for configuring how raw source columns map to canonical
 * metric fields. Supports field selection, column mapping CRUD, unit type registry
 * management, sample data preview, and test-run / full-run execution with result display.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import FormBody from "@templates/form-body";
import { FormFieldLabel } from "@templates/form-field-label";
import { fetchWithRetry } from "@/utils/api-fetch";
import {
  COLUMN_MAPPINGS_ENDPOINT,
  DETAIL_ENDPOINT,
  ROLE_BADGE,
  ROLE_HELP_TEXT,
  RUN_MAPPING_ENDPOINT,
  SAMPLE_ROWS_ENDPOINT,
  TEST_RUN_ENDPOINT,
  UNIT_TYPES_ENDPOINT,
} from "./schema_mapping_editor.constants";
import {
  type FieldRow,
  type InferredRole,
  type MappingForm,
  type RunMappingResult,
  type SampleRow,
  type TestRunResult,
  type UnitTypeForm,
  type UnitTypeRow,
} from "./schema_mapping_editor.types";
import { fetchJson, inferRole, unwrapList } from "./schema_mapping_editor.utils";
import SchemaMappingEditorColumnMappingPanel from "./schema_mapping_editor_column_mapping_panel";
import SchemaMappingEditorMappingActions from "./schema_mapping_editor_mapping_actions";
import SchemaMappingEditorSamplePanel from "./schema_mapping_editor_sample_panel";
import SchemaMappingEditorUnitRegistryPanel from "./schema_mapping_editor_unit_registry_panel";

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
      void Promise.resolve().then(() => {
        setUnitTypeForm({
          unit_name: selectedUnitType.unit_name,
          base_data_type: selectedUnitType.base_data_type,
          description: selectedUnitType.description,
        });
      });
    } else {
      void Promise.resolve().then(() => {
        setUnitTypeForm({ unit_name: "", base_data_type: "float", description: "" });
      });
    }
  }, [selectedUnitType]);

  // Load field rows
  useEffect(() => {
    if (!sourceSystem || !datasetKey) {
      void Promise.resolve().then(() => setFieldRows([]));
      return;
    }
    const params = new URLSearchParams({ source_system: sourceSystem, dataset_key: datasetKey });
    void Promise.resolve().then(() => setFieldLoading(true));
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
    if (!sourceSystem || !datasetKey) {
      void Promise.resolve().then(() => setSampleRows([]));
      return;
    }
    const params = new URLSearchParams({ source_system: sourceSystem, dataset_key: datasetKey, limit: "20" });
    void Promise.resolve().then(() => setSampleLoading(true));
    fetchJson<unknown>(`${SAMPLE_ROWS_ENDPOINT}?${params}`)
      .then((data) => setSampleRows(unwrapList<SampleRow>(data)))
      .catch(() => setSampleRows([]))
      .finally(() => setSampleLoading(false));
  }, [sourceSystem, datasetKey]);

  // Sync mapping form when field selection changes
  useEffect(() => {
    if (!selectedField) return;
    void Promise.resolve().then(() => {
      setMappingForm({
        column_label: selectedField.column_label,
        semantic_key: selectedField.semantic_key || selectedField.suggested_semantic_key,
        unit_type_id: selectedField.unit_type_id,
        notes: selectedField.notes,
        include_in_ingestion: selectedField.include_in_ingestion,
      });
      setMappingError(null);
    });
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
    } catch {
      setMappingError("Failed to delete mapping.");
    }
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
          className="btn-secondary"
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
          className="btn-secondary"
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
        <table className="data-table text-sm">
          <thead className="data-table__thead">
            <tr>
              <th className="data-table__header-cell">Raw Column</th>
              <th className="data-table__header-cell">Semantic Key</th>
              <th className="data-table__header-cell">Column Label</th>
              <th className="data-table__header-cell">Unit Type</th>
              <th className="data-table__header-cell">
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
              <tr><td colSpan={5} className="data-table__body-cell text-center">Loading...</td></tr>
            )}
            {!fieldLoading && fieldRows.length === 0 && (
              <tr><td colSpan={5} className="data-table__body-cell text-center">No raw fields found for this dataset.</td></tr>
            )}
            {!fieldLoading && fieldRows.map((row) => {
              const active = selectedField?.raw_column === row.raw_column;
              const role = inferRole(row);
              return (
                <tr
                  key={row.raw_column}
                  onClick={() => setSelectedField(row)}
                  className={[
                    "data-table__row data-table__row--interactive",
                    active ? "bg-sky-50 dark:bg-sky-950/30" : "",
                  ].join(" ")}
                >
                  <td className="data-table__body-cell font-mono text-xs text-slate-700 dark:text-slate-300">{row.raw_column}</td>
                  <td className="data-table__body-cell font-mono text-xs text-slate-600 dark:text-slate-400">{row.semantic_key || <span className="italic text-slate-400">-</span>}</td>
                  <td className="data-table__body-cell text-slate-600 dark:text-slate-400">{row.column_label || <span className="italic text-slate-400">-</span>}</td>
                  <td className="data-table__body-cell text-slate-600 dark:text-slate-400">{row.unit_type_name || <span className="italic text-slate-400">-</span>}</td>
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
          <SchemaMappingEditorSamplePanel
            selectedRawColumn={selectedField.raw_column}
            sampleRows={sampleRows}
            sampleLoading={sampleLoading}
          />

          {/* Panel 2 - Column Mapping Editor */}
          <SchemaMappingEditorColumnMappingPanel
            hasExistingMapping={Boolean(selectedField.column_mapping_id)}
            suggestedSemanticKey={selectedField.suggested_semantic_key}
            mappingForm={mappingForm}
            previewRole={previewRole}
            unitTypes={unitTypes}
            mappingError={mappingError}
            mappingSaving={mappingSaving}
            onChangeMappingForm={setMappingForm}
            onSaveMapping={() => void handleSaveMapping()}
            onDeleteMapping={() => void handleDeleteMapping()}
          />

          {/* Panel 3 - Unit Type Registry */}
          <SchemaMappingEditorUnitRegistryPanel
            unitTypes={unitTypes}
            selectedUnitTypeId={selectedUnitTypeId}
            unitTypeForm={unitTypeForm}
            unitTypeSaving={unitTypeSaving}
            onSelectUnitType={setSelectedUnitTypeId}
            onAddUnitType={handleAddUnitType}
            onChangeUnitTypeForm={setUnitTypeForm}
            onSaveUnitType={() => void handleSaveUnitType()}
            onDeleteUnitType={() => void handleDeleteUnitType()}
          />

          </div>

          {/* Mapping Actions */}
          <SchemaMappingEditorMappingActions
            fieldRowsLength={fieldRows.length}
            testRunLoading={testRunLoading}
            runMappingLoading={runMappingLoading}
            onTestRun={() => void handleTestRun()}
            onRunMapping={() => void handleRunMapping()}
            testRunResult={testRunResult}
            onClearTestRunResult={() => setTestRunResult(null)}
            runMappingResult={runMappingResult}
            onClearRunMappingResult={() => setRunMappingResult(null)}
          />
        </>
      )}
    </FormBody>
  );
}
