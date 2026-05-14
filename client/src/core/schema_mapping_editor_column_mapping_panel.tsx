/**
 * Column mapping configuration panel for the schema mapping editor.
 * Provides the form for editing a single column's mapping properties:
 * semantic key, unit type, column label, notes, inferred role badge, and
 * the include-in-ingestion toggle.
 */
import { FormFieldLabel } from "@templates/form-field-label";
import { FIELD_HINT, ROLE_BADGE, ROLE_HELP_TEXT } from "./schema_mapping_editor.constants";
import type { InferredRole, MappingForm, UnitTypeRow } from "./schema_mapping_editor.types";

type SchemaMappingEditorColumnMappingPanelProps = {
  hasExistingMapping: boolean;
  suggestedSemanticKey: string;
  mappingForm: MappingForm;
  previewRole: InferredRole;
  unitTypes: UnitTypeRow[];
  mappingError: string | null;
  mappingSaving: boolean;
  onChangeMappingForm: (next: MappingForm) => void;
  onSaveMapping: () => void;
  onDeleteMapping: () => void;
};

export default function SchemaMappingEditorColumnMappingPanel({
  hasExistingMapping,
  suggestedSemanticKey,
  mappingForm,
  previewRole,
  unitTypes,
  mappingError,
  mappingSaving,
  onChangeMappingForm,
  onSaveMapping,
  onDeleteMapping,
}: SchemaMappingEditorColumnMappingPanelProps) {
  return (
    <div className="rounded border border-slate-200 p-4 dark:border-slate-700">
      <h3 className="mb-2 text-base font-semibold">Column Mapping</h3>
      <div className="mb-3 flex items-center gap-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {hasExistingMapping ? "Editing existing mapping." : "No mapping yet - will create on save."}
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
            onChange={(e) => onChangeMappingForm({ ...mappingForm, column_label: e.target.value })}
          />
        </div>

        <div className="block">
          <FormFieldLabel label="Semantic Key" hintInfo={FIELD_HINT.semanticKey} htmlFor="mapping-semantic-key" />
          <input
            id="mapping-semantic-key"
            className="form-input font-mono"
            placeholder={suggestedSemanticKey}
            value={mappingForm.semantic_key}
            onChange={(e) => onChangeMappingForm({ ...mappingForm, semantic_key: e.target.value })}
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
            onChange={(e) => onChangeMappingForm({ ...mappingForm, unit_type_id: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">- none -</option>
            {unitTypes.map((unitType) => (
              <option key={unitType.unit_type_id} value={unitType.unit_type_id}>
                {unitType.unit_name} [{unitType.base_data_type}]
              </option>
            ))}
          </select>
        </div>

        <div className="block">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={mappingForm.include_in_ingestion}
              onChange={(e) => onChangeMappingForm({ ...mappingForm, include_in_ingestion: e.target.checked })}
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
            onChange={(e) => onChangeMappingForm({ ...mappingForm, notes: e.target.value })}
          />
        </div>
      </div>

      {mappingError && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{mappingError}</p>
      )}

      <div className="mt-4 flex gap-2">
        <button type="button" className="btn-primary" onClick={onSaveMapping} disabled={mappingSaving}>
          {mappingSaving ? "Saving..." : hasExistingMapping ? "Save Changes" : "Create Mapping"}
        </button>
        {hasExistingMapping && (
          <button type="button" className="btn-danger" onClick={onDeleteMapping}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
