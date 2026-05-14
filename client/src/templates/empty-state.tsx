/**
 * Placeholder shown inside a DataGrid (or any list container) when there are no results.
 * @param label - Optional custom message; defaults to "No records found."
 */
type EmptyStateProps = {
  label?: string;
};

export default function EmptyState({ label = "No records found." }: EmptyStateProps) {
  return (
    <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
      {label}
    </div>
  );
}