/**
 * Inline error banner for displaying API or validation error messages.
 * @param message - Error text to display.
 * @param onRetry - Optional callback; when provided, a "Retry" button is rendered.
 */
type ErrorBannerProps = {
  message: string;
  onRetry?: () => void;
};

export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn-secondary text-xs" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}