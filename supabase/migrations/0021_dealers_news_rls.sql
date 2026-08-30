-- SECURITY (K-1): lock down the two content tables.
--
-- `dealers` and `distributor_news` were created outside these migrations and
-- had RLS disabled, so the public `anon` key (shipped in the browser bundle as
-- NEXT_PUBLIC_SUPABASE_ANON_KEY) could read every row — all producer / dealer
-- identities, addresses, phone numbers and e-mails — straight from
-- `/rest/v1/dealers`. That completely bypassed the server-side masking that the
-- access tiers rely on (lib/mask.ts).
--
-- Fix: enable RLS and add NO select policy for anon / authenticated, so PostgREST
-- returns zero rows for both roles. The app now reads these tables only through
-- the service-role client (lib/dealers-data.ts, lib/news-data.ts), and
-- service_role bypasses RLS. We also revoke the table grants outright as a
-- second layer, and grant SELECT back to service_role explicitly.
--
-- Run order: AFTER 0020_profiles_deletion_request.sql. No dependency on any
-- earlier migration beyond the tables themselves already existing.

-- 1) dealers -----------------------------------------------------------------
alter table public.dealers enable row level security;
-- Belt-and-suspenders: RLS with no policy already denies these roles, but drop
-- the underlying grants too so a future policy added by mistake still can't leak.
revoke all on table public.dealers from anon, authenticated;
grant select on table public.dealers to service_role;

-- 2) distributor_news ------------------------------------------------------
alter table public.distributor_news enable row level security;
revoke all on table public.distributor_news from anon, authenticated;
grant select on table public.distributor_news to service_role;

-- 3) network_coverage_stats() -------------------------------------------------
-- Only ever called server-side now (lib/dealers-data.ts, via the service-role
-- client). It reads public.dealers, so with RLS on it must run as an owner that
-- bypasses RLS -> switch from `security invoker` to `security definer`, keep the
-- pinned search_path, and restrict EXECUTE to service_role only (was anon +
-- authenticated).
create or replace function public.network_coverage_stats()
returns table (
  pump_models bigint,
  pump_producers bigint,
  countries bigint,
  pump_dealers bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select
      pump,
      bayi_ulke,
      case
        when uretici is null or btrim(uretici) in ('', '.', '-') then null
        else lower(btrim(uretici))
      end as producer_key,
      case
        when bayi_adi is null or btrim(bayi_adi) in ('', '.', '-') then null
        else lower(btrim(bayi_adi)) || '|' ||
          case
            when bayi_ulke is null or btrim(bayi_ulke) in ('', '.', '-') then ''
            else lower(btrim(bayi_ulke))
          end
      end as dealer_key
    from public.dealers
  )
  select
    count(distinct pump)
      filter (where pump is not null and btrim(pump) not in ('', '.', '-')),
    count(distinct producer_key)
      filter (where producer_key is not null),
    count(distinct bayi_ulke)
      filter (where bayi_ulke is not null and btrim(bayi_ulke) not in ('', '.', '-')),
    count(distinct dealer_key)
      filter (where dealer_key is not null)
  from normalized;
$$;

revoke all on function public.network_coverage_stats() from public, anon, authenticated;
grant execute on function public.network_coverage_stats() to service_role;
