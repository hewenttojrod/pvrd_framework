/**
 * Mapping action buttons panel for the schema mapping editor.
 * Renders the "Test Mapping" and "Run Mapping" action buttons and displays
 * their results — including per-field success/error/warning feedback.
 */
import type { RunMappingResult, TestRunResult } from "./schema_mapping_editor.types";

type SchemaMappingEditorMappingActionsProps = {
  fieldRowsLength: number;
  testRunLoading: boolean;
  runMappingLoading: boolean;
  onTestRun: () => void;
  onRunMapping: () => void;
  testRunResult: TestRunResult | null;
  onClearTestRunResult: () => void;
  runMappingResult: RunMappingResult | null;
  onClearRunMappingResult: () => void;
};

export default function SchemaMappingEditorMappingActions({
  fieldRowsLength,
  testRunLoading,
  runMappingLoading,
  onTestRun,
  onRunMapping,
  testRunResult,
  onClearTestRunResult,
  runMappingResult,
  onClearRunMappingResult,
}: SchemaMappingEditorMappingActionsProps) {
  return (
    <div className="mt-5 rounded border border-slate-200 p-4 dark:border-slate-700">
      <h3 className="mb-3 text-base font-semibold">Mapping Actions</h3>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={onTestRun} disabled={testRunLoading || !fieldRowsLength}>
          {testRunLoading ? "Testing..." : "Test Mapping"}
        </button>
        <button type="button" className="btn-primary" onClick={onRunMapping} disabled={runMappingLoading || !fieldRowsLength}>
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
              onClick={onClearTestRunResult}
            >
              x
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
                  {testRunResult.validation_warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
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
              onClick={onClearRunMappingResult}
            >
              x
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
  );
}
