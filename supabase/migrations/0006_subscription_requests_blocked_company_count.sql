-- Snapshot of how many "blocking" slots were purchased in a subscription
-- request, so Settings can render exactly that many company slots without
-- re-deriving it from blocked_companies row counts (which change over time
-- as slots are filled, added, or cancelled).
alter table public.subscription_requests
  add column if not exists blocked_company_count integer not null default 0;
