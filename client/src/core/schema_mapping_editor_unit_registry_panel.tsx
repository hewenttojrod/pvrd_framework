/**
 * Unit type registry panel for the schema mapping editor.
 * Displays all configured unit types and provides create, edit, and delete
 * operations via an inline form within the editor's right panel.
 */
import { FormFieldLabel } from "@templates/form-field-label";
import { BASE_DATA_TYPE_OPTIONS, FIELD_HINT } from "./schema_mapping_editor.constants";
import type { UnitTypeForm, UnitTypeRow } from "./schema_mapping_editor.types";

type SchemaMappingEditorUnitRegistryPanelProps = {
  unitTypes: UnitTypeRow[];
  selectedUnitTypeId: number | null;
  unitTypeForm: UnitTypeForm;
  unitTypeSaving: boolean;
  onSelectUnitType: (id: number) => void;
  onAddUnitType: () => void;
  onChangeUnitTypeForm: (next: UnitTypeForm) => void;
  onSaveUnitType: () => void;
  onDeleteUnitType: () => void;
};

export default function SchemaMappingEditorUnitRegistryPanel({
  unitTypes,
  selectedUnitTypeId,
  unitTypeForm,
  unitTypeSaving,
  onSelectUnitType,
  onAddUnitType,
  onChangeUnitTypeForm,
  onSaveUnitType,
  onDeleteUnitType,
}: SchemaMappingEditorUnitRegistryPanelProps) {
  return (
    <div className="rounded border border-slate-200 p-4 dark:border-slate-700">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Unit Type Registry</h3>
        <button type="button" className="btn-secondary" onClick={onAddUnitType}>+ New</button>
      </div>

      <div className="mb-3 max-h-48 overflow-auto rounded border border-slate-200 dark:border-slate-700">
        <table className="data-table text-sm">
          <thead className="data-table__thead">
            <tr>
              <th className="data-table__header-cell">Unit</th>
              <th className="data-table__header-cell">Type</th>
            </tr>
          </thead>
          <tbody>
            {unitTypes.length === 0 && (
              <tr><td colSpan={2} className="data-table__body-cell text-center">No unit types yet.</td></tr>
            )}
            {unitTypes.map((unitType) => (
              <tr
                key={unitType.unit_type_id}
                onClick={() => onSelectUnitType(unitType.unit_type_id)}
                className={[
                  "data-table__row data-table__row--interactive",
                  selectedUnitTypeId === unitType.unit_type_id ? "bg-sky-50 dark:bg-sky-950/30" : "",
                ].join(" ")}
              >
                <td className="data-table__body-cell text-slate-700 dark:text-slate-300">{unitType.unit_name}</td>
                <td className="data-table__body-cell text-slate-500 dark:text-slate-400">{unitType.base_data_type}</td>
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
            onChange={(e) => onChangeUnitTypeForm({ ...unitTypeForm, unit_name: e.target.value })}
          />
        </div>

        <div className="block">
          <FormFieldLabel label="Base Data Type" hintInfo={FIELD_HINT.baseDataType} htmlFor="unit-base-data-type" />
          <select
            id="unit-base-data-type"
            className="form-input"
            value={unitTypeForm.base_data_type}
            onChange={(e) => onChangeUnitTypeForm({ ...unitTypeForm, base_data_type: e.target.value })}
          >
            {BASE_DATA_TYPE_OPTIONS.map((baseType) => (
              <option key={baseType} value={baseType}>{baseType}</option>
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
            onChange={(e) => onChangeUnitTypeForm({ ...unitTypeForm, description: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button type="button" className="btn-primary" onClick={onSaveUnitType} disabled={unitTypeSaving}>
          {unitTypeSaving ? "Saving..." : selectedUnitTypeId ? "Save Unit Type" : "Create Unit Type"}
        </button>
        {selectedUnitTypeId && (
          <button type="button" className="btn-danger" onClick={onDeleteUnitType}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
