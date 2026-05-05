import { useMemo, useState } from "react";
import FormBody from "@templates/form-body";

type BaseDataType = "float" | "int" | "bool" | "string" | "datetime";

type UnitType = {
  id: string;
  unit_name: string;
  base_data_type: BaseDataType;
  description: string;
};

type ColumnMapping = {
  id: string;
  source_system: string;
  dataset_key: string;
  raw_column: string;
  semantic_key: string;
  unit_type_id: string | null;
  column_label: string;
  notes: string;
};

const BASE_TYPE_OPTIONS: BaseDataType[] = ["float", "int", "bool", "string", "datetime"];

const INITIAL_UNIT_TYPES: UnitType[] = [
  {
    id: "u_datetime",
    unit_name: "datetime",
    base_data_type: "datetime",
    description: "Observation timestamp. Columns mapped here become the time axis for normalization.",
  },
  {
    id: "u_power_mw",
    unit_name: "MW",
    base_data_type: "float",
    description: "Instantaneous power values used across load and generation reports.",
  },
  {
    id: "u_price_usd_mwh",
    unit_name: "USD/MWh",
    base_data_type: "float",
    description: "Wholesale energy price.",
  },
  {
    id: "u_share_pct",
    unit_name: "%",
    base_data_type: "float",
    description: "Percentage share values.",
  },
];

const INITIAL_MAPPINGS: ColumnMapping[] = [
  {
    id: "m1",
    source_system: "nyiso",
    dataset_key: "p58b_load",
    raw_column: "Timestamp",
    semantic_key: "interval_start",
    unit_type_id: "u_datetime",
    column_label: "",
    notes: "Observation timestamp",
  },
  {
    id: "m2",
    source_system: "nyiso",
    dataset_key: "p58b_load",
    raw_column: "Load MW",
    semantic_key: "load_mw",
    unit_type_id: "u_power_mw",
    column_label: "",
    notes: "System load value",
  },
  {
    id: "m3",
    source_system: "nyiso",
    dataset_key: "p58b_load",
    raw_column: "Zone",
    semantic_key: "zone_name",
    unit_type_id: null,
    column_label: "zone",
    notes: "Load zone",
  },
  {
    id: "m4",
    source_system: "nyiso",
    dataset_key: "p63_generation",
    raw_column: "Interval Start",
    semantic_key: "interval_start",
    unit_type_id: "u_datetime",
    column_label: "",
    notes: "Interval boundary",
  },
  {
    id: "m5",
    source_system: "nyiso",
    dataset_key: "p63_generation",
    raw_column: "Gen MW",
    semantic_key: "gen_mw",
    unit_type_id: "u_power_mw",
    column_label: "",
    notes: "Generation value",
  },
  {
    id: "m6",
    source_system: "nyiso",
    dataset_key: "p63_generation",
    raw_column: "Fuel Type",
    semantic_key: "fuel_type",
    unit_type_id: null,
    column_label: "fuel_type",
    notes: "Generation category",
  },
];

function groupLabel(mapping: ColumnMapping): string {
  return `${mapping.source_system} / ${mapping.dataset_key}`;
}

type InferredRole = "timestamp" | "value" | "dimension" | "unmapped";

function inferRole(mapping: ColumnMapping, unitTypes: UnitType[]): InferredRole {
  if (mapping.unit_type_id) {
    const unit = unitTypes.find((u) => u.id === mapping.unit_type_id);
    return unit?.base_data_type === "datetime" ? "timestamp" : "value";
  }
  if (mapping.column_label.trim()) {
    return "dimension";
  }
  return "unmapped";
}

const ROLE_BADGE: Record<InferredRole, string> = {
  timestamp: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  value: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  dimension: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  unmapped: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export default function ColumnUnitMappingPrototypePage() {
  const [unitTypes, setUnitTypes] = useState<UnitType[]>(INITIAL_UNIT_TYPES);
  const [mappings, setMappings] = useState<ColumnMapping[]>(INITIAL_MAPPINGS);
  const [selectedMappingId, setSelectedMappingId] = useState<string>(INITIAL_MAPPINGS[0].id);
  const [selectedUnitTypeId, setSelectedUnitTypeId] = useState<string>(INITIAL_UNIT_TYPES[0].id);

  const selectedMapping = useMemo(
    () => mappings.find((item) => item.id === selectedMappingId) ?? mappings[0],
    [mappings, selectedMappingId]
  );

  const selectedUnitType = useMemo(
    () => unitTypes.find((item) => item.id === selectedUnitTypeId) ?? unitTypes[0],
    [unitTypes, selectedUnitTypeId]
  );

  const valueMappingsSharingUnit = useMemo(
    () => mappings.filter((item) => item.unit_type_id === selectedUnitType?.id),
    [mappings, selectedUnitType]
  );

  const handleMappingChange = (patch: Partial<ColumnMapping>) => {
    if (!selectedMapping) {
      return;
    }
    setMappings((prev) =>
      prev.map((item) => {
        if (item.id !== selectedMapping.id) {
          return item;
        }
        return { ...item, ...patch };
      })
    );
  };

  const addUnitType = () => {
    const created: UnitType = {
      id: `u_${Date.now()}`,
      unit_name: "unit",
      base_data_type: "float",
      description: "Describe what this unit type represents.",
    };
    setUnitTypes((prev) => [...prev, created]);
    setSelectedUnitTypeId(created.id);
  };

  const handleUnitTypeChange = (patch: Partial<UnitType>) => {
    if (!selectedUnitType) {
      return;
    }
    setUnitTypes((prev) => prev.map((item) => (item.id === selectedUnitType.id ? { ...item, ...patch } : item)));
  };

  return (
    <FormBody
      title="ColumnMapping + UnitType Prototype"
      subtitle="Semantic key lives on each column mapping. Unit type describes physical units; column label identifies dimension columns. Role is always inferred."
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <section className="rounded border border-slate-200 p-4 dark:border-slate-700 xl:col-span-4">
          <h2 className="mb-2 text-base font-semibold">Columns (Schema -{'>'} Column Mapping)</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Each column gets a semantic key. Set a unit type for measurements/timestamps, or a column label for dimension columns.
          </p>
          <div className="max-h-128 overflow-auto rounded border border-slate-200 dark:border-slate-700">
            <table className="w-full table-auto border-collapse text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Dataset</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Column</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Semantic Key</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Role</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedMappingId(item.id)}
                    className={[
                      "cursor-pointer border-t border-slate-100 dark:border-slate-800",
                      selectedMapping?.id === item.id ? "bg-sky-50 dark:bg-sky-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                    ].join(" ")}
                  >
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{groupLabel(item)}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{item.raw_column}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-400">{item.semantic_key || <span className="italic text-slate-400">—</span>}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${ROLE_BADGE[inferRole(item, unitTypes)]}`}>
                        {inferRole(item, unitTypes)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded border border-slate-200 p-4 dark:border-slate-700 xl:col-span-4">
          <h2 className="mb-2 text-base font-semibold">Column Mapping Editor</h2>
          {selectedMapping ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Selected Column</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {groupLabel(selectedMapping)} {"-"}{'>'} {selectedMapping.raw_column}
                </p>
                <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${ROLE_BADGE[inferRole(selectedMapping, unitTypes)]}`}>
                  Inferred role: {inferRole(selectedMapping, unitTypes)}
                </span>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Column Label
                  <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-slate-500">— identifies dimension columns</span>
                </span>
                <input
                  className="form-input"
                  placeholder="zone, fuel_type, market, node"
                  value={selectedMapping.column_label}
                  onChange={(event) => handleMappingChange({ column_label: event.target.value })}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Semantic Key</span>
                <input
                  className="form-input font-mono"
                  placeholder="load_mw, interval_start, zone_name"
                  value={selectedMapping.semantic_key}
                  onChange={(event) => handleMappingChange({ semantic_key: event.target.value })}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Unit Type
                  <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-slate-500">— infers value or timestamp role</span>
                </span>
                <select
                  className="form-input"
                  value={selectedMapping.unit_type_id ?? ""}
                  onChange={(event) => handleMappingChange({ unit_type_id: event.target.value || null })}
                >
                  <option value="">Select unit type</option>
                  {unitTypes.map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.unit_name} [{unit.base_data_type}]</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Notes</span>
                <textarea
                  className="form-input"
                  rows={3}
                  value={selectedMapping.notes}
                  onChange={(event) => handleMappingChange({ notes: event.target.value })}
                />
              </label>

              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                Role inference rules:
                <div className="mt-1">1. unit type with base_data_type=datetime {"-"}{'>'} timestamp</div>
                <div>2. unit type with any other base_data_type {"-"}{'>'} value</div>
                <div>3. column label filled, no unit type {"-"}{'>'} dimension</div>
                <div>4. neither filled {"-"}{'>'} unmapped</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Select a column to edit.</p>
          )}
        </section>

        <section className="rounded border border-slate-200 p-4 dark:border-slate-700 xl:col-span-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Unit Type Registry</h2>
            <button type="button" className="btn-secondary" onClick={addUnitType}>+ Add Unit Type</button>
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
                {unitTypes.map((unit) => (
                  <tr
                    key={unit.id}
                    className={[
                      "cursor-pointer border-t border-slate-100 dark:border-slate-800",
                      selectedUnitType?.id === unit.id ? "bg-sky-50 dark:bg-sky-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                    ].join(" ")}
                    onClick={() => setSelectedUnitTypeId(unit.id)}
                  >
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{unit.unit_name}</td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{unit.base_data_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedUnitType && (
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Unit Name</span>
                <input
                  className="form-input"
                  value={selectedUnitType.unit_name}
                  onChange={(event) => handleUnitTypeChange({ unit_name: event.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Base Data Type</span>
                <select
                  className="form-input"
                  value={selectedUnitType.base_data_type}
                  onChange={(event) => handleUnitTypeChange({ base_data_type: event.target.value as BaseDataType })}
                >
                  {BASE_TYPE_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</span>
                <textarea
                  className="form-input"
                  rows={3}
                  value={selectedUnitType.description}
                  onChange={(event) => handleUnitTypeChange({ description: event.target.value })}
                />
              </label>
            </div>
          )}

          <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            <p className="font-semibold">Cross-report Side-by-Side Preview</p>
            <p className="mt-1">All columns mapped to this Unit Type:</p>
            <ul className="mt-2 space-y-1">
              {valueMappingsSharingUnit.length === 0 && <li>None yet.</li>}
              {valueMappingsSharingUnit.map((item) => (
                <li key={item.id}>
                  {groupLabel(item)} {"-"}{'>'} {item.raw_column}
                  <span className={`ml-2 inline-block rounded px-1 py-0.5 text-xs font-medium ${ROLE_BADGE[inferRole(item, unitTypes)]}`}>
                    {inferRole(item, unitTypes)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </FormBody>
  );
}