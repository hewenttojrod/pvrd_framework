/**
 * Animated spinner with a label shown during async data loads.
 * @param label - Optional custom label; defaults to "Loading..."
 */
type LoadingStateProps = {
  label?: string;
};

export default function LoadingState({ label = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500 dark:text-slate-400">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-200" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}