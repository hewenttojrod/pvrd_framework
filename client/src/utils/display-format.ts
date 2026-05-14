/**
 * Formats a nullable ISO 8601 timestamp string for display in the UI.
 *
 * - Returns `fallback` (default `"-"`) when `value` is null, undefined, or an empty string.
 * - Returns the original `value` string unchanged when it cannot be parsed as a valid date.
 * - Otherwise converts to a locale-aware date-time string via `Date.toLocaleString()`.
 *
 * @param value    - Raw timestamp string from the API (ISO 8601), or null.
 * @param fallback - String shown when the value is absent; defaults to `"-"`.
 */
export function formatNullableTimestamp(value: string | null, fallback = "-"): string {
  if (!value) {
    return fallback;
  }

  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? value : timestamp.toLocaleString();
}