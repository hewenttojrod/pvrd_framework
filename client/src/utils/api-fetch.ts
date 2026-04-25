/**
 * API fetch utilities for backend communication.
 * Provides retry logic with exponential backoff (via setTimeout),
 * per-attempt 30-second timeout, and automatic URL resolution via VITE_API_BASE_URL.
 */

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 10;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/$/, "");

/**
 * Resolves a URL string to its absolute form.
 * - If input is already a full URL (http:// or https://), returns it unchanged
 * - If VITE_API_BASE_URL is configured, prepends it to the path
 * - Otherwise returns the input path as-is (for relative requests)
 * 
 * @param input - URL string or relative path
 * @returns Resolved URL (absolute or relative)
 */
export function resolveApiUrl(input: string): string {
  if (/^https?:\/\//i.test(input)) {
    return input;
  }

  if (!API_BASE_URL) {
    return input;
  }

  const normalizedPath = input.startsWith("/") ? input : `/${input}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

/**
 * Wraps `fetch` with a per-attempt 30-second timeout and up to 10 retries on
 * network/timeout failures. Non-2xx responses are NOT retried — only genuine
 * network errors and timeouts are.
 *
 * @param input   URL string or Request
 * @param init    Standard RequestInit; pass `signal` to support external abort
 * @param retries Maximum retry attempts (default 10)
 */
export async function fetchWithRetry(
  input: string | URL | Request,
  init: RequestInit = {},
  retries = MAX_RETRIES
): Promise<Response> {
  const externalSignal = init.signal as AbortSignal | null | undefined;
  const requestTarget =
    typeof input === "string"
      ? resolveApiUrl(input)
      : input instanceof URL
        ? new URL(resolveApiUrl(input.toString()))
        : input;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);

    const combinedSignal = externalSignal
      ? AbortSignal.any([externalSignal, timeoutController.signal])
      : timeoutController.signal;

    try {
      const response = await fetch(requestTarget, { ...init, signal: combinedSignal });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);

      // If the caller's own abort signal fired, stop immediately.
      if (externalSignal?.aborted) throw err;

      const isLastAttempt = attempt === retries;
      if (isLastAttempt) throw err;

      // Only retry on network / timeout errors (TypeError or AbortError from timeout).
      const isRetryable =
        err instanceof TypeError ||
        (err instanceof Error && err.name === "AbortError");

      if (!isRetryable) throw err;
    }
  }

  // Unreachable — loop always returns or throws.
  throw new Error("fetchWithRetry: exhausted retries");
}
