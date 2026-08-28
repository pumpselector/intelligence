-- Mirror auth.users.email_confirmed_at into profiles.email_verified so admin /
-- application code can read the email-confirmation state from profiles alone,
-- without touching the auth schema.

alter table public.profiles
  add column if not exists email_verified boolean not null default false;

-- Backfill from existing auth users.
update public.profiles p
set email_verified = true
from auth.users u
where u.id = p.id
  and u.email_confirmed_at is not null
  and p.email_verified = false;

-- Keep it in sync going forward.
create or replace function public.sync_email_verified()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set email_verified = (new.email_confirmed_at is not null)
  where id = new.id;
  return new;
end;
$$;

-- Fires on initial insert (covers "email confirmation disabled" auto-confirm)
-- and whenever email_confirmed_at changes (the normal confirm flow).
drop trigger if exists on_auth_user_email_verified on auth.users;

create trigger on_auth_user_email_verified
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.sync_email_verified();

-- Also set the flag at profile-creation time so a brand-new confirmed user is
-- correct even if trigger ordering ever changes.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, email_verified)
  values (new.id, new.email, new.email_confirmed_at is not null);
  return new;
end;
$$;
