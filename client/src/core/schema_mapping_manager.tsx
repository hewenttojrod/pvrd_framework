/**
 * Schema mapping manager page.
 * Lists all source mappings with their field counts and mapping status.
 * Clicking a row navigates to the schema mapping editor for that source.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@app-types/api";
import DataGrid from "@templates/data-grid";
import FormBody from "@templates/form-body";

const SOURCE_MAPPINGS_ENDPOINT = "/api/core/schema/source-mappings/";

type SourceMappingSummaryRow = {
  source_system: string;
  dataset_key: string;
  file_count: number;
  raw_field_count: number;
  mapped_field_count: number;
  unmapped_field_count: number;
  sample_unmapped_fields: string[];
};

export default function SchemaMappingManager() {
  const navigate = useNavigate();
  const [sourceFilter, setSourceFilter] = useState("");
  const [gridRefreshKey] = useState(0);

  const sourceParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (sourceFilter) {
      params.source_system = sourceFilter;
    }
    return params;
  }, [sourceFilter]);

  const sourceColumns: ColumnDef<SourceMappingSummaryRow>[] = useMemo(
    () => [
      { key: "source_system", label: "Source", sortable: true, width: "110px" },
      { key: "dataset_key", label: "Dataset", sortable: true },
      { key: "file_count", label: "Files", width: "70px" },
      { key: "raw_field_count", label: "Fields", width: "70px" },
      { key: "mapped_field_count", label: "Mapped", width: "80px" },
      {
        key: "unmapped_field_count",
        label: "Needs Mapping",
        width: "110px",
        render: (value) => <span className={Number(value) > 0 ? "font-semibold text-amber-700 dark:text-amber-300" : ""}>{String(value)}</span>,
      },
      {
        key: "sample_unmapped_fields",
        label: "Missing Fields",
        render: (value) => Array.isArray(value) && value.length > 0 ? value.join(", ") : "Ready",
      },
    ],
    []
  );

  return (
    <FormBody
      title="Source Mapping"
      subtitle="Select a source row to open the mapping editor page."
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          className="form-input w-48"
          placeholder="Filter source system"
          value={sourceFilter}
          onChange={(event) => setSourceFilter(event.target.value)}
        />
      </div>

      <DataGrid<SourceMappingSummaryRow>
        key={gridRefreshKey}
        columns={sourceColumns}
        endpoint={SOURCE_MAPPINGS_ENDPOINT}
        params={sourceParams}
        onRowClick={(row) => {
          const params = new URLSearchParams({
            source_system: row.source_system,
            dataset_key: row.dataset_key,
          });
          navigate(`/core/schema-mappings/edit?${params.toString()}`);
        }}
        contextMenuActions={[]}
        layoutOptions={{ stickyHeader: true, maxHeight: "62vh" }}
      />
    </FormBody>
  );
}
