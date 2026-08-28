-- Access-level columns on profiles.
--   approved (already exists) + paid + subscription_status drive the 4 tiers:
--     level 0: no session
--     level 1: session, approved = false
--     level 2: approved = true,  paid = false
--     level 3: approved = true,  paid = true   -> full access
-- Levels 0/1/2 all get the same masked view (only the top banner differs).

alter table public.profiles
  add column if not exists paid boolean not null default false;

alter table public.profiles
  add column if not exists subscription_status text not null default 'none';

-- 'none' | 'active' | 'cancelled' | 'past_due'
alter table public.profiles
  drop constraint if exists profiles_subscription_status_check;

alter table public.profiles
  add constraint profiles_subscription_status_check
  check (subscription_status in ('none', 'active', 'cancelled', 'past_due'));

-- The existing "Users can view own profile" SELECT policy already covers the
-- new columns, so the login page / server access check can read them as-is.
