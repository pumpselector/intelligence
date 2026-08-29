-- Tracks how long a currently-blocked company stays blocked: mirrors the
-- user's subscription_requests.next_payment_date at the time the row becomes
-- active, and is kept in sync whenever the admin pushes that date forward
-- after taking a payment. No automatic deactivation happens here -- that
-- lands once PayPal billing is actually connected.

alter table public.blocked_companies
  add column if not exists active_until date;

-- Whenever a row is (or becomes) status = 'active' -- on first insert or on
-- a later update -- stamp active_until from the user's most recent
-- subscription_requests.next_payment_date. Stays null if that isn't set yet.
create or replace function public.set_blocked_company_active_until()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'active' then
    select next_payment_date into new.active_until
    from public.subscription_requests
    where user_id = new.user_id
    order by created_at desc
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists set_blocked_company_active_until on public.blocked_companies;
create trigger set_blocked_company_active_until
  before insert or update of status on public.blocked_companies
  for each row execute function public.set_blocked_company_active_until();

-- When the admin records a payment (next_payment_date moves forward), push
-- that same date onto every currently-active blocked_companies row for that
-- user.
create or replace function public.sync_active_until_on_payment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.next_payment_date is distinct from old.next_payment_date then
    update public.blocked_companies
    set active_until = new.next_payment_date
    where user_id = new.user_id
      and status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists sync_active_until_on_payment on public.subscription_requests;
create trigger sync_active_until_on_payment
  after update of next_payment_date on public.subscription_requests
  for each row execute function public.sync_active_until_on_payment();
