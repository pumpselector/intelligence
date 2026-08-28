-- profiles table: one row per auth.users row, holds the invite-approval flag.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Each user can read their own approval status (needed by the login page
-- and by proxy.ts, both of which query this table as the signed-in user).
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Auto-insert a profiles row whenever a new user signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
