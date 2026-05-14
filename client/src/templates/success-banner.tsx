/**
 * Inline success banner shown after a successful API operation (save, delete, etc.).
 * @param message - Confirmation text to display.
 */
type SuccessBannerProps = {
  message: string;
};

export default function SuccessBanner({ message }: SuccessBannerProps) {
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
      {message}
    </div>
  );
}