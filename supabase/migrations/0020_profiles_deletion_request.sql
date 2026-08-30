-- "Delete my account" from Settings does not really delete anything — it flags
-- the profile so an admin can do the real removal by hand in Supabase. Once
-- flagged, the user is locked out (login is blocked and getAccess() treats them
-- as a signed-out visitor).

alter table public.profiles
  add column if not exists deletion_requested boolean not null default false,
  add column if not exists deletion_requested_at timestamptz;

-- The existing "Users can view own profile" SELECT policy (migration 0001)
-- already covers the new columns; the flag itself is only ever set through the
-- service-role client in /api/account/delete-request.
