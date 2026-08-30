-- Standard -> Blocking is a PayPal PLAN CHANGE, not a price revise.
--
-- When a Standard subscriber queues their first billable competitor block from
-- Settings, the fixed-price Standard PayPal plan has to be swapped for the
-- Blocking plan (a different plan_id) via POST /v1/billing/subscriptions/{id}
-- /revise. That change needs buyer approval, so plan_type must NOT flip in our
-- records until PayPal confirms it (BILLING.SUBSCRIPTION.UPDATED webhook).
--
-- Stash the target plan next to the pending price/count so the webhook (and the
-- PAYMENT.SALE.COMPLETED reconcile path) can apply and then clear it, exactly
-- like pending_revised_price / pending_revised_block_count.

alter table public.subscription_requests
  add column if not exists pending_revised_plan_type text
    check (pending_revised_plan_type in ('standard', 'blocking'));
