/**
 * Safe JSON parsing for this app's own `/api/*` fetch calls
 * (deposit.tsx, salesperson.tsx). Calling `res.json()` directly throws an
 * opaque native error ("JSON Parse error: Unexpected character: N") when
 * the response isn't actually JSON — most commonly a plain-text "Not
 * Found" (a route the client fetched wrong) or "Network request failed"
 * (no connectivity to the dev server) — with no indication of what the
 * response actually was. This reads the body as text first, so a parse
 * failure surfaces the real response (truncated) and status code instead,
 * which is the difference between "something broke" and being able to
 * tell what.
 */
export async function parseJsonResponse<T = unknown>(res: Response): Promise<T> {
  const raw = await res.text();
  try {
    return JSON.parse(raw) as T;
  } catch {
    const snippet = raw.slice(0, 120).replace(/\s+/g, ' ').trim();
    throw new Error(
      `Server returned an unexpected response (HTTP ${res.status})${snippet ? `: "${snippet}"` : ' (empty body)'}`,
    );
  }
}
