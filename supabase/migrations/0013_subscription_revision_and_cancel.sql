-- Subscription amount revision (block list changes) + user-initiated cancel.
--
-- 1) When a blocking subscriber changes their block list from Settings, the
--    PayPal subscription amount for the NEXT cycle must follow. We stash the
--    target on the row and call PayPal's /revise API; the webhook promotes the
--    pending values into the live columns once PayPal confirms.
--
-- 2) "Cancel subscription" from Settings calls PayPal's /cancel API (which is
--    immediate and sends no further lifecycle events). We keep data access
--    until the period end ourselves via profiles.access_until, checked in
--    getAccess() — no cron needed, access simply downgrades once the date
--    passes.
--
-- 3) is_billable_addition marks a blocked_companies row that was added *beyond*
--    the slots already paid for (the "+ Add another company" action), so the
--    revise endpoint can compute the next-cycle count as
--      blocked_company_count + (pending additions) - (pending removals)
--    without being fooled by fills of already-paid, still-empty slots.

alter table public.subscription_requests
  add column if not exists pending_revised_block_count integer,
  add column if not exists pending_revised_price numeric(10, 2),
  add column if not exists cancel_at_period_end boolean not null default false;

alter table public.profiles
  add column if not exists access_until date;

alter table public.blocked_companies
  add column if not exists is_billable_addition boolean not null default false;
