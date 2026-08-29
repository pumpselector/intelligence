-- PayPal Subscriptions wiring.
--
-- Until now subscription_requests rows carried no real payment: a user picked a
-- plan and an admin flipped `status` to 'active' by hand from the Table Editor.
-- With PayPal connected, every row is created against a PayPal subscription and
-- stores its id, so:
--   * /api/paypal/activate-subscription can confirm the row after onApprove
--   * /api/webhooks/paypal can move the row on ACTIVATED / CANCELLED / FAILED
--
-- A failed renewal now needs a 'past_due' state that the old CHECK didn't allow.

alter table public.subscription_requests
  add column if not exists paypal_subscription_id text;

-- One subscription_requests row per PayPal subscription (nulls allowed for the
-- legacy / no-credentials fallback path, which never sets this column).
create unique index if not exists subscription_requests_paypal_subscription_id_key
  on public.subscription_requests (paypal_subscription_id)
  where paypal_subscription_id is not null;

alter table public.subscription_requests
  drop constraint if exists subscription_requests_status_check;

alter table public.subscription_requests
  add constraint subscription_requests_status_check
  check (status in ('pending_payment', 'active', 'past_due', 'cancelled'));

-- profiles.subscription_status already allows 'none' | 'active' | 'cancelled' |
-- 'past_due' (migration 0002), so no change is needed there.
