// Error responses from proxies/hosts are not necessarily JSON (or even nonempty).
// Read once and keep the HTTP status instead of replacing it with a parser error.
export async function readApiResponse(
  response,
  { operation = 'Request', allowEmpty = false, apiRequest = false } = {}
) {
  const text = await response.text();
  let data;
  try {
    data = text.trim() ? JSON.parse(text) : undefined;
  } catch {
    /* Handled below. */
  }
  const isObject = data !== null && typeof data === 'object' && !Array.isArray(data);
  if (response.ok && isObject) return data;
  if (response.ok && allowEmpty && !text.trim()) return null;

  const status = `HTTP ${response.status}`;
  const detail = isObject && (data.error?.message || data.message);
  let message =
    typeof detail === 'string' && detail.trim()
      ? `${operation}: ${detail} (${status}).`
      : `${operation} failed (${status}): ${text.trim() ? 'the server returned a non-JSON response' : 'the server returned an empty response'}.`;
  if (apiRequest && (response.status === 404 || (response.ok && !isObject))) {
    message +=
      ' The app API is unavailable. For local development, run npm run dev:full and use the URL it prints. On a deployed site, check that the API function is deployed.';
  }
  const error = new Error(message);
  error.status = response.status;
  error.retryable =
    response.status === 408 || response.status === 429 || response.status >= 500 || response.ok;
  throw error;
}
