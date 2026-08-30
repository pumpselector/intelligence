-- SECURITY (O-1): make subscription_requests / blocked_companies writable only
-- by the service role (server-side API routes), not by the browser client.
--
-- Migrations 0004 / 0005 / 0016 gave `authenticated` users INSERT / UPDATE /
-- DELETE policies scoped to `auth.uid() = user_id` and nothing else. That let
-- any email-confirmed user (approval / payment not required) write rows the app
-- then trusts:
--   * unlimited blocked_companies rows with status = 'active'  -> free slots
--   * subscription_requests rows with arbitrary status / monthly_price /
--     plan_type / paypal_subscription_id
--   * a forged paypal_subscription_id in such a row is picked up by
--     /api/paypal/{cancel,reactivate}-subscription and sent to PayPal's
--     suspend / activate API -> an attacker who knows another customer's real
--     PayPal subscription id could suspend that customer's subscription.
--
-- Fix: drop every client write policy. The SELECT policies from migration 0004
-- stay, so a user still reads their own rows (Settings page, PricingClient
-- count check). All writes now go exclusively through service-role routes:
--   /api/subscription-requests/create      (fallback / no-PayPal flow)   [new]
--   /api/blocked-companies/fill-slot        (Settings slot fill)          [new]
--   /api/paypal/create-subscription         (already service-role)
--   /api/paypal/activate-subscription       (already service-role)
--   /api/paypal/cancel-subscription         (already service-role)
--   /api/paypal/reactivate-subscription     (already service-role)
--   /api/webhooks/paypal                    (already service-role)
--
-- Run order: AFTER 0021_dealers_news_rls.sql.

-- subscription_requests: had SELECT + INSERT (0004). Drop INSERT.
drop policy if exists "own subscription_requests - insert" on public.subscription_requests;

-- blocked_companies: had SELECT + INSERT (0004) + UPDATE (0005) + DELETE (0016).
-- Drop all three write policies.
drop policy if exists "own blocked_companies - insert" on public.blocked_companies;
drop policy if exists "own blocked_companies - update" on public.blocked_companies;
drop policy if exists "own blocked_companies - delete pending" on public.blocked_companies;

-- Belt-and-suspenders: drop the underlying write grants for the client roles so
-- a policy added by mistake later still can't open a write path. SELECT stays
-- granted (the SELECT policies need it). service_role keeps everything and
-- bypasses RLS regardless; re-grant explicitly for clarity.
revoke insert, update, delete on table public.subscription_requests from anon, authenticated;
revoke insert, update, delete on table public.blocked_companies     from anon, authenticated;

grant insert, update, delete on table public.subscription_requests to service_role;
grant insert, update, delete on table public.blocked_companies     to service_role;
