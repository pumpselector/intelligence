-- Adds dealer contact-detail columns to distributor_news, named to match the
-- dealers table (bayi_adres / bayi_telefon / bayi_email / bayi_web). These back
-- the /news Details view so it can show the same address / phone / clickable
-- email + website block that the Intelligence dealer modal shows.
--
-- The existing free-text `detay` column is intentionally left in place: its
-- contents are migrated into these columns by hand, and `detay` is dropped
-- manually later once that move is done. Until then both are shown in the UI.

alter table public.distributor_news
  add column if not exists bayi_adres text,
  add column if not exists bayi_telefon text,
  add column if not exists bayi_email text,
  add column if not exists bayi_web text;
