import "server-only";

/**
 * Thin server-side PayPal REST helper. No SDK — just fetch against the REST API,
 * with a cached OAuth2 client-credentials token.
 *
 * Environment (all optional so the app builds without them):
 *   PAYPAL_API_BASE            sandbox: https://api-m.sandbox.paypal.com (default)
 *                              live:    https://api-m.paypal.com
 *   PAYPAL_CLIENT_ID           REST app client id  (falls back to the public one)
 *   NEXT_PUBLIC_PAYPAL_CLIENT_ID  same value, exposed to the browser SDK
 *   PAYPAL_CLIENT_SECRET       REST app secret
 *   PAYPAL_WEBHOOK_ID          id of the webhook created in the PayPal dashboard
 *   PAYPAL_STANDARD_PLAN_ID    billing plan id for the fixed 59,99 €/mo plan
 *   PAYPAL_BLOCKING_PLAN_ID    billing plan id for the base "blocking" plan
 *                              (its first cycle price is overridden per request)
 */

export const PAYPAL_API_BASE =
  process.env.PAYPAL_API_BASE?.replace(/\/$/, "") || "https://api-m.sandbox.paypal.com";

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";

export const PAYPAL_PLAN_IDS: Record<"standard" | "blocking", string> = {
  standard: process.env.PAYPAL_STANDARD_PLAN_ID || "",
  blocking: process.env.PAYPAL_BLOCKING_PLAN_ID || "",
};

/** True when the server has everything it needs to talk to PayPal. */
export function paypalConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`PayPal token request failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

type PayPalRequestInit = Omit<RequestInit, "body"> & { body?: unknown };

/** Authenticated JSON request to the PayPal REST API. Throws on any non-2xx. */
export async function paypalRequest<T = Record<string, unknown>>(
  path: string,
  init: PayPalRequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`PayPal ${path} -> ${res.status}: ${text}`);
  }
  return data as T;
}

/**
 * Confirms a webhook notification really came from PayPal via the
 * verify-webhook-signature API + PAYPAL_WEBHOOK_ID. Returns false (never throws)
 * so the caller can answer 400 cleanly. Returns false when PAYPAL_WEBHOOK_ID is
 * unset — an unverifiable webhook is rejected, not trusted.
 */
export async function verifyWebhookSignature(headers: Headers, rawBody: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId || !paypalConfigured()) return false;

  try {
    const token = await getAccessToken();
    const res = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: JSON.parse(rawBody),
      }),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { verification_status?: string };
    return json.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}

/** PayPal subscription id shape, e.g. "I-BW452GLLEP1G". */
export const PAYPAL_SUBSCRIPTION_ID_RE = /^I-[A-Z0-9]+$/;

type MinimalSubscription = {
  id: string;
  status: string;
  custom_id?: string;
  billing_info?: { next_billing_time?: string };
};

/**
 * Fetches a subscription from PayPal and confirms it belongs to `userId` — the
 * app user id is stored in `custom_id` at creation time
 * (/api/paypal/create-subscription). Returns the subscription on success, or
 * `null` on a bad id shape, a lookup failure, or a `custom_id` that names a
 * different user. Callers must treat `null` as "do not act on this subscription".
 *
 * Defence in depth: migration 0022 already stops a user from inserting a
 * subscription_requests row with someone else's paypal_subscription_id, but the
 * cancel / reactivate routes verify against PayPal directly as well, so a forged
 * id can never reach PayPal's suspend / activate API.
 */
export async function getOwnedSubscription(
  subscriptionId: string | null | undefined,
  userId: string
): Promise<MinimalSubscription | null> {
  if (!subscriptionId || !PAYPAL_SUBSCRIPTION_ID_RE.test(subscriptionId)) return null;
  try {
    const sub = await paypalRequest<MinimalSubscription>(
      `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`
    );
    // Reject only on an explicit mismatch — a subscription created by this app
    // always carries custom_id; an absent one is left to the caller's own
    // user_id-scoped DB lookup.
    if (sub.custom_id && sub.custom_id !== userId) return null;
    return sub;
  } catch {
    return null;
  }
}

/** ISO timestamp -> "YYYY-MM-DD" for the `next_payment_date` date column. */
export function toDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : null;
}
