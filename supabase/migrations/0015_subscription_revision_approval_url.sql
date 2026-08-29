-- PayPal-funded subscriptions require the buyer to re-consent to any plan /
-- pricing change: POST /v1/billing/subscriptions/{id}/revise returns an
-- "approve" HATEOAS link and PayPal keeps billing the OLD amount until the
-- buyer visits it and approves. We now store that link so:
--   * the Settings page can show a persistent "approve the new amount" CTA
--     when the buyer closed the PayPal tab without finishing, and
--   * /api/paypal/revise-subscription knows an approval is still outstanding
--     and re-issues a fresh link instead of reporting "nothing changed".
--
-- Cleared (together with pending_revised_block_count / pending_revised_price)
-- by /api/webhooks/paypal once BILLING.SUBSCRIPTION.UPDATED confirms the
-- revision, or once a renewal is actually billed at the new amount.

alter table public.subscription_requests
  add column if not exists pending_revision_approval_url text;
