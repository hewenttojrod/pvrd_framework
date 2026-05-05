import { useMemo, useState } from "react";
import type { ColumnDef } from "@app-types/api";
import DataGrid from "@templates/data-grid";
import EntryForm from "@templates/entry-form";
import FormBody from "@templates/form-body";
import type { FieldDef } from "@app-types/api";

const METRICS_ENDPOINT = "/api/core/schema/metrics/";

type MetricRow = {
  metric_id: number;
  canonical_name: string;
  display_name: string;
  unit: string;
  value_type: string;
  aggregation_default: string;
  comparable_group: string;
};

const VALUE_TYPE_OPTIONS = [
  { label: "Float", value: "float" },
  { label: "Integer", value: "int" },
  { label: "Boolean", value: "bool" },
  { label: "String", value: "string" },
];

const AGG_OPTIONS = [
  { label: "Average", value: "avg" },
  { label: "Sum", value: "sum" },
  { label: "Max", value: "max" },
  { label: "Min", value: "min" },
  { label: "Last", value: "last" },
];

const METRIC_FIELDS: FieldDef<MetricRow>[] = [
  { key: "canonical_name", label: "Canonical Name", type: "text", required: true, placeholder: "e.g. nyiso.rtfuelmix.gen_mw" },
  { key: "display_name", label: "Display Name", type: "text", required: true, placeholder: "e.g. Generation (MW)" },
  { key: "unit", label: "Unit", type: "text", placeholder: "e.g. MW, USD, %" },
  { key: "value_type", label: "Value Type", type: "select", options: VALUE_TYPE_OPTIONS },
  { key: "aggregation_default", label: "Default Aggregation", type: "select", options: AGG_OPTIONS },
  { key: "comparable_group", label: "Comparable Group", type: "text", placeholder: "e.g. nyiso_generation" },
];

export default function MetricManager() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: ColumnDef<MetricRow>[] = useMemo(
    () => [
      { key: "canonical_name", label: "Canonical Name", sortable: true },
      { key: "display_name", label: "Display Name", sortable: true },
      { key: "unit", label: "Unit", width: "80px" },
      { key: "value_type", label: "Type", width: "80px" },
      { key: "aggregation_default", label: "Agg", width: "70px" },
      { key: "comparable_group", label: "Comparable Group" },
    ],
    []
  );

  const handleSuccess = () => {
    setSelectedId(null);
    setShowCreate(false);
    setRefreshKey((k) => k + 1);
  };

  return (
    <FormBody title="Metrics" subtitle="Define canonical metrics shared across all modules.">

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          className="btn-primary"
          onClick={() => { setShowCreate(true); setSelectedId(null); }}
        >
          + New Metric
        </button>
        {(selectedId !== null || showCreate) && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => { setSelectedId(null); setShowCreate(false); }}
          >
            Close
          </button>
        )}
      </div>

      {showCreate && (
        <div className="mb-6 rounded border border-slate-200 p-4 dark:border-slate-700">
          <h2 className="mb-4 text-base font-semibold">New Metric</h2>
          <EntryForm<MetricRow>
            fields={METRIC_FIELDS}
            endpoint={METRICS_ENDPOINT}
            initialMode="create"
            onSuccess={handleSuccess}
            onCancel={() => { setShowCreate(false); }}
          />
        </div>
      )}

      {selectedId !== null && (
        <div className="mb-6 rounded border border-slate-200 p-4 dark:border-slate-700">
          <h2 className="mb-4 text-base font-semibold">Edit Metric #{selectedId}</h2>
          <EntryForm<MetricRow>
            fields={METRIC_FIELDS}
            endpoint={METRICS_ENDPOINT}
            recordId={selectedId}
            initialMode="edit"
            onSuccess={handleSuccess}
            onCancel={() => setSelectedId(null)}
          />
        </div>
      )}

      <DataGrid<MetricRow>
        key={refreshKey}
        columns={columns}
        endpoint={METRICS_ENDPOINT}
        rowKey="metric_id"
        contextMenuActions={[
          {
            id: "edit-metric",
            label: "Edit",
            onClick: ({ row }) => {
              if (row) {
                setSelectedId(row.metric_id);
              }
            },
          },
        ]}
        layoutOptions={{ stickyHeader: true, maxHeight: "60vh" }}
      />
    </FormBody>
  );
}
