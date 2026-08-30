import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paypalRequest, toDateOnly, verifyWebhookSignature } from "@/lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WebhookEvent = {
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    custom_id?: string;
    billing_agreement_id?: string; // PAYMENT.SALE.COMPLETED
    billing_info?: { next_billing_time?: string };
  };
};

type SubscriptionRequestRow = {
  id: string;
  user_id: string;
  cancel_at_period_end: boolean | null;
};

/**
 * PayPal webhook target. Configure a webhook in the PayPal dashboard pointing at
 * `<site>/api/webhooks/paypal`, subscribed to:
 *   BILLING.SUBSCRIPTION.ACTIVATED
 *   BILLING.SUBSCRIPTION.CANCELLED
 *   BILLING.SUBSCRIPTION.EXPIRED
 *   BILLING.SUBSCRIPTION.PAYMENT.FAILED
 *   PAYMENT.SALE.COMPLETED
 * then set PAYPAL_WEBHOOK_ID to the id it hands you.
 *
 * Every event is signature-verified against PAYPAL_WEBHOOK_ID before we act.
 * All DB writes go through the service-role client (no session on a webhook).
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!(await verifyWebhookSignature(request.headers, rawBody))) {
    return NextResponse.json({ error: "signature_verification_failed" }, { status: 400 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const type = event.event_type ?? "";
  const resource = event.resource ?? {};

  // BILLING.SUBSCRIPTION.* carry the subscription id as resource.id;
  // PAYMENT.SALE.COMPLETED carries it as resource.billing_agreement_id.
  const subscriptionId = type.startsWith("BILLING.SUBSCRIPTION")
    ? resource.id
    : resource.billing_agreement_id;

  if (!subscriptionId) {
    return NextResponse.json({ ok: true, ignored: type, reason: "no_subscription_id" });
  }

  const admin = createAdminClient();

  const { data: reqRow } = await admin
    .from("subscription_requests")
    .select("id, user_id, cancel_at_period_end")
    .eq("paypal_subscription_id", subscriptionId)
    .maybeSingle<SubscriptionRequestRow>();

  if (!reqRow) {
    return NextResponse.json({ ok: true, ignored: type, reason: "unknown_subscription" });
  }

  switch (type) {
    case "BILLING.SUBSCRIPTION.ACTIVATED": {
      const nextPaymentDate = toDateOnly(resource.billing_info?.next_billing_time);
      await admin
        .from("subscription_requests")
        .update({
          status: "active",
          ...(nextPaymentDate ? { next_payment_date: nextPaymentDate } : {}),
        })
        .eq("id", reqRow.id);
      await admin
        .from("profiles")
        .update({ paid: true, subscription_status: "active" })
        .eq("id", reqRow.user_id);
      await admin
        .from("blocked_companies")
        .update({ status: "active" })
        .eq("user_id", reqRow.user_id)
        .eq("status", "pending_next_cycle");
      break;
    }

    case "PAYMENT.SALE.COMPLETED": {
      // Recurring payment cleared — refresh the next billing date from the
      // subscription (the sale payload doesn't include it) and keep the user
      // marked paid. Amount / block-list changes are reconciled manually now.
      let nextPaymentDate: string | null = null;
      try {
        const sub = await paypalRequest<{ billing_info?: { next_billing_time?: string } }>(
          `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`
        );
        nextPaymentDate = toDateOnly(sub.billing_info?.next_billing_time);
      } catch {
        /* keep whatever date is already stored */
      }
      await admin
        .from("subscription_requests")
        .update({
          status: "active",
          ...(nextPaymentDate ? { next_payment_date: nextPaymentDate } : {}),
        })
        .eq("id", reqRow.id);
      await admin
        .from("profiles")
        .update({ paid: true, subscription_status: "active" })
        .eq("id", reqRow.user_id);
      break;
    }

    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED": {
      await admin
        .from("subscription_requests")
        .update({ status: "cancelled" })
        .eq("id", reqRow.id);

      if (reqRow.cancel_at_period_end) {
        // User-initiated cancel: /api/paypal/cancel-subscription already set
        // profiles.access_until, keeping data access until the paid period ends.
        // Don't drop `paid` or the block list here.
        await admin
          .from("profiles")
          .update({ subscription_status: "cancelled" })
          .eq("id", reqRow.user_id);
      } else {
        // Involuntary / PayPal-side termination: full teardown.
        await admin
          .from("profiles")
          .update({ paid: false, subscription_status: "cancelled", access_until: null })
          .eq("id", reqRow.user_id);
        await admin.from("blocked_companies").delete().eq("user_id", reqRow.user_id);
      }
      break;
    }

    case "BILLING.SUBSCRIPTION.PAYMENT.FAILED": {
      await admin
        .from("subscription_requests")
        .update({ status: "past_due" })
        .eq("id", reqRow.id);
      await admin
        .from("profiles")
        .update({ subscription_status: "past_due" })
        .eq("id", reqRow.user_id);
      break;
    }

    default:
      return NextResponse.json({ ok: true, ignored: type });
  }

  return NextResponse.json({ ok: true, handled: type });
}
