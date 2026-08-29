import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses Row Level Security.
 *
 * Server-only: never import this into a Client Component. Used by the PayPal
 * activation route and webhook to flip `profiles.paid` /
 * `subscription_requests.status` for a user who isn't the caller (the webhook
 * has no session at all).
 *
 * Throws if the service-role key isn't set, so callers should gate on
 * `paypalConfigured()` (or their own env check) before constructing it and fall
 * back to the no-payment flow when PayPal isn't wired up yet.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL not configured");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
