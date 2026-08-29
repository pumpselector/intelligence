-- Replace the admin-only email views (migration 0008) with real, denormalized
-- user_email columns on the tables themselves -- easier to browse, filter and
-- sort in Table Editor without a join.

alter table public.subscription_requests
  add column if not exists user_email text;

alter table public.blocked_companies
  add column if not exists user_email text;

-- Keep user_email in sync with profiles.email whenever a row is inserted, or
-- updated with a new user_id -- callers never need to pass it themselves.
create or replace function public.sync_user_email()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  select email into new.user_email from public.profiles where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists sync_user_email on public.subscription_requests;
create trigger sync_user_email
  before insert or update of user_id on public.subscription_requests
  for each row execute function public.sync_user_email();

drop trigger if exists sync_user_email on public.blocked_companies;
create trigger sync_user_email
  before insert or update of user_id on public.blocked_companies
  for each row execute function public.sync_user_email();

-- Backfill existing rows.
update public.subscription_requests sr
set user_email = p.email
from public.profiles p
where p.id = sr.user_id
  and sr.user_email is distinct from p.email;

update public.blocked_companies bc
set user_email = p.email
from public.profiles p
where p.id = bc.user_id
  and bc.user_email is distinct from p.email;

-- No longer needed now that both tables carry the email directly. Nothing in
-- the application queries these (confirmed: only used from the SQL editor /
-- Table Editor).
drop view if exists internal.subscription_requests_with_email;
drop view if exists internal.blocked_companies_with_email;
