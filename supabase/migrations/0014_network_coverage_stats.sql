-- Home-page "Network Coverage" totals, computed in Postgres in a single round
-- trip instead of pulling every dealer row (~5.5k) to the Next.js server just
-- to count distinct values in JS.
--
-- The four numbers mirror the client-side helpers in lib/dealers.ts exactly:
--   pump_models    -> distinct non-empty `pump`        (raw value; hasValue())
--   pump_producers -> distinct lower(trim(uretici))    (producerKey())
--   countries      -> distinct non-empty `bayi_ulke`   (raw value; hasValue())
--   pump_dealers   -> distinct lower(trim(bayi_adi)) || '|' || lower(trim(bayi_ulke))
--                                                      (dealerKey())
--
-- "non-empty" (hasValue) = not null and, once trimmed, not one of '', '.', '-'.
-- Note: Postgres lower() and JS toLowerCase() can differ on a few locale edge
-- cases, so these counts may drift from the old client-side numbers by a unit
-- or two. Acceptable for a headline stat.

create or replace function public.network_coverage_stats()
returns table (
  pump_models bigint,
  pump_producers bigint,
  countries bigint,
  pump_dealers bigint
)
language sql
stable
security invoker
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

grant execute on function public.network_coverage_stats() to anon, authenticated;
