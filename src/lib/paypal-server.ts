/**
 * Shared PayPal REST helper for the create-order and capture-order server
 * routes (src/app/api/paypal/*+api.ts). Deliberately lives in src/lib, not
 * under src/app/api/paypal — a first version put it there as a plain
 * `client.ts`, and Expo Router treats EVERY file under src/app as
 * potentially routable, not just `+api.ts` ones, so it got exposed as its
 * own client-facing route (`/api/paypal/client`) instead of staying an
 * internal helper. src/lib is this project's existing home for shared,
 * non-route logic — same fix category as "don't put secrets in the
 * client," just for routing instead of bundling.
 *
 * `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` come from `.env` — sandbox
 * credentials today (developer.paypal.com), same file, same
 * "server-only, never bundled to the client" rule as ANTHROPIC_API_KEY in
 * chat+api.ts. `PAYPAL_API_BASE` defaults to the sandbox host on purpose —
 * per docs/backend-and-ai-agent-plan.md's "Strategy" section, moving to
 * live PayPal should be a credential/env swap, not a code change, so this
 * one env var is the entire "sandbox vs. live" switch.
 */

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE ?? 'https://api-m.sandbox.paypal.com';

interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/** Not cached across requests on purpose — this is low-volume (deposits,
 * not checkout-page traffic) and correctness matters more than shaving
 * one extra call; add caching later if usage ever makes it worth it. */
export async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set');
  }

  // btoa, not Buffer — API routes run in a WinterCG-style sandboxed
  // runtime (not full Node), and Buffer isn't guaranteed to exist there;
  // btoa is the standard Web API and portable across both.
  const basicAuth = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`PayPal OAuth token request failed: ${res.status} ${await res.text()}`);
  }

  const data: PayPalTokenResponse = await res.json();
  return data.access_token;
}

export async function paypalFetch(path: string, init: RequestInit & { accessToken: string }) {
  const { accessToken, headers, ...rest } = init;
  const res = await fetch(`${PAYPAL_API_BASE}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...headers,
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal API error (${path}): ${res.status} ${JSON.stringify(body)}`);
  }
  return body;
}
