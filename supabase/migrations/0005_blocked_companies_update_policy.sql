-- /settings lets a paid user flag their own blocked_companies rows for removal
-- (status -> 'removed_pending'); the admin does the real removal at the next
-- billing cycle. That needs an UPDATE policy on top of the existing
-- select + insert policies from migration 0004. Rows are never deleted here.

create policy "own blocked_companies - update" on public.blocked_companies
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
