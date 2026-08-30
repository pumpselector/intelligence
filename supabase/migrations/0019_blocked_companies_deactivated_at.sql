-- Block-list rows are never hard-deleted any more — the team keeps them for
-- reference ("which companies were blocked, and are they still active?").
--
-- On cancellation the user keeps full access (and their blocks) until
-- profiles.access_until; the row is only meant to stop counting after that.
-- We record that moment in deactivated_at instead of deleting the row. There is
-- no cron enforcing it, so "currently active" is read as:
--     status = 'active' and (deactivated_at is null or deactivated_at > now())
--
-- Involuntary teardown (PayPal-side cancel / expiry / repeated payment failure)
-- sets deactivated_at = now() — access is gone immediately in that case.

alter table public.blocked_companies
  add column if not exists deactivated_at timestamptz;

create index if not exists blocked_companies_deactivated_at_idx
  on public.blocked_companies (deactivated_at);
