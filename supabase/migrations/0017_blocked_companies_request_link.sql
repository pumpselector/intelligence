-- Duplicate-blocked-company fix.
--
-- A double-clicked or retried PayPal checkout called
-- /api/paypal/create-subscription more than once. Each call created its own
-- PayPal subscription AND its own set of blocked_companies rows, so the same
-- company name landed in the table twice (once per attempt) even though only
-- one attempt was ever paid.
--
-- 1) Tie every blocked_companies row to the subscription_requests row it was
--    created for. An abandoned "pending_payment" attempt can then be removed
--    wholesale (ON DELETE CASCADE clears its blocked_companies) before a fresh
--    attempt is recorded.
-- 2) Permit at most one in-flight PayPal checkout per user: a partial unique
--    index over the pending PayPal rows. A racing second create call then
--    fails at the database instead of duplicating rows.

alter table public.blocked_companies
  add column if not exists subscription_request_id uuid
    references public.subscription_requests (id) on delete cascade;

create index if not exists blocked_companies_subscription_request_id_idx
  on public.blocked_companies (subscription_request_id);

-- Abandoned duplicate attempts left over from the bug this migration fixes
-- would block the unique index below. Keep only the most recent pending PayPal
-- attempt per user (none of these were ever paid — a paid one is 'active').
delete from public.subscription_requests sr
where sr.status = 'pending_payment'
  and sr.paypal_subscription_id is not null
  and sr.id not in (
    select distinct on (user_id) id
    from public.subscription_requests
    where status = 'pending_payment' and paypal_subscription_id is not null
    order by user_id, created_at desc
  );

create unique index if not exists subscription_requests_one_pending_paypal_per_user
  on public.subscription_requests (user_id)
  where status = 'pending_payment' and paypal_subscription_id is not null;
