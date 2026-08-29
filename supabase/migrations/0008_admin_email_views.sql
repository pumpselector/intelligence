-- Admin-only convenience views (Supabase Table Editor / SQL editor), joining
-- profiles.email so subscription_requests / blocked_companies rows are
-- readable without a manual join.
--
-- These live in a dedicated "internal" schema rather than "public" on
-- purpose: PostgREST only exposes schemas it's configured with (public /
-- graphql_public by default), so putting them here keeps them out of the
-- REST API entirely -- they're for browsing in Table Editor only. A view in
-- "public" would otherwise inherit the project's default grants to
-- anon/authenticated and, since views run with the *owner's* privileges,
-- would bypass the row-level security on the underlying tables.
--
-- Application code keeps reading the base tables in "public" directly; this
-- migration only adds read surface for the admin.
--
-- Run this after 0006 and 0007 so blocked_company_count and
-- next_payment_date are already columns on subscription_requests -- a later
-- "create or replace view" can only append columns at the very end of the
-- output list, and here they'd land before user_email, which isn't allowed.

create schema if not exists internal;

create or replace view internal.subscription_requests_with_email as
select
  sr.*,
  p.email as user_email
from public.subscription_requests sr
join public.profiles p on p.id = sr.user_id
order by sr.created_at desc;

create or replace view internal.blocked_companies_with_email as
select
  bc.*,
  p.email as user_email
from public.blocked_companies bc
join public.profiles p on p.id = bc.user_id
order by bc.requested_at desc;
