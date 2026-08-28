-- Phase-3 subscription capture. PayPal isn't connected yet, so nothing here
-- takes real payment: a user's choice is recorded and left for an admin to
-- activate manually (Supabase Table Editor -> subscription_requests).

-- One row per plan selection.
create table if not exists public.subscription_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_type text not null check (plan_type in ('standard', 'blocking')),
  -- Total monthly price computed at selection time, e.g. 59.99 or 159.97.
  monthly_price numeric(10, 2) not null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'active', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists subscription_requests_user_id_idx
  on public.subscription_requests (user_id);

-- Competitor names / domains a "blocking" subscriber wants kept off the platform.
-- Free text: may be a domain or a company name.
create table if not exists public.blocked_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  company_name text not null,
  status text not null default 'pending_next_cycle'
    check (status in ('pending_next_cycle', 'active', 'removed_pending')),
  requested_at timestamptz not null default now(),
  -- Unknown until PayPal is connected and the first billing date is fixed.
  effective_from date,
  removed_at timestamptz
);

create index if not exists blocked_companies_user_id_idx
  on public.blocked_companies (user_id);

alter table public.subscription_requests enable row level security;
alter table public.blocked_companies enable row level security;

-- Users can see and create only their own rows. service_role (Supabase dashboard,
-- admin scripts) bypasses RLS entirely, so no extra admin policy is needed.
create policy "own subscription_requests - select" on public.subscription_requests
  for select using (auth.uid() = user_id);

create policy "own subscription_requests - insert" on public.subscription_requests
  for insert with check (auth.uid() = user_id);

create policy "own blocked_companies - select" on public.blocked_companies
  for select using (auth.uid() = user_id);

create policy "own blocked_companies - insert" on public.blocked_companies
  for insert with check (auth.uid() = user_id);
