/**
 * Sample data panel for the schema mapping editor.
 * Displays raw sample values for the currently selected source column,
 * giving the user visibility into actual data before configuring its mapping.
 */
import type { SampleRow } from "./schema_mapping_editor.types";

type SchemaMappingEditorSamplePanelProps = {
  selectedRawColumn: string;
  sampleRows: SampleRow[];
  sampleLoading: boolean;
};

export default function SchemaMappingEditorSamplePanel({
  selectedRawColumn,
  sampleRows,
  sampleLoading,
}: SchemaMappingEditorSamplePanelProps) {
  return (
    <div className="rounded border border-slate-200 p-4 dark:border-slate-700">
      <h3 className="mb-2 text-base font-semibold">Sample Data</h3>
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
        Values for <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{selectedRawColumn}</span>
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
            {!sampleLoading && sampleRows.map((sampleRow, index) => {
              const val = sampleRow.row_payload_json[selectedRawColumn];
              const display = val == null ? "-" : typeof val === "object" ? JSON.stringify(val) : String(val);
              return (
                <tr key={index} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">{sampleRow.source_file_name}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{sampleRow.row_number}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">{display}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
