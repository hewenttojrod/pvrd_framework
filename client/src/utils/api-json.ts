/**
 * Parses a `Response` object from `fetchWithRetry` into a typed payload.
 *
 * Behaviour:
 * - Throws an `Error` for any non-2xx status (passes the HTTP status and text as the message).
 * - Returns `undefined` (cast to `TPayload`) for HTTP 204 No Content or blank response bodies,
 *   so callers do not need to guard against `JSON.parse("")` exceptions.
 * - Otherwise reads the body as text and parses it as JSON.
 *
 * @template TPayload - Expected shape of the parsed JSON body.
 */
export async function parseJsonResponse<TPayload>(response: Response): Promise<TPayload> {
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  // Handle successful responses with no content (e.g. HTTP 204).
  if (response.status === 204) {
    return undefined as TPayload;
  }

  const text = await response.text();
  if (!text.trim()) {
    return undefined as TPayload;
  }

  return JSON.parse(text) as TPayload;
}