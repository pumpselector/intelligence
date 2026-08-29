-- No payment provider is wired up yet (see migration 0004), so this is filled
-- in by hand from the Supabase dashboard until PayPal billing is connected.
alter table public.subscription_requests
  add column if not exists next_payment_date date;
