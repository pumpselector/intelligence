-- Settings lets a subscriber take back a block-list slot that hasn't started
-- yet — a "+ Add another company" addition or a next-cycle name change they
-- reconsidered before the billing cycle it belongs to. Those rows are always
-- status = 'pending_next_cycle'.
--
-- migrations 0004 / 0005 gave blocked_companies only select / insert / update
-- policies (rows are never deleted from Settings today). This adds a DELETE
-- policy scoped to the caller's own not-yet-active rows. 'active' and
-- 'removed_pending' rows stay delete-protected here — those map to paid slots
-- and are only ever cleared server-side (webhook teardown / admin).

create policy "own blocked_companies - delete pending" on public.blocked_companies
  for delete using (auth.uid() = user_id and status = 'pending_next_cycle');
