import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paypalConfigured, paypalRequest, toDateOnly } from "@/lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubscriptionResource = {
  id: string;
  status: string;
  custom_id?: string;
  billing_info?: { next_billing_time?: string };
};

/**
 * Called from the browser SDK's `onApprove` with the approved subscription id.
 * Verifies the subscription with PayPal, checks it belongs to this user, and —
 * if PayPal already reports it ACTIVE — flips the user to paid immediately.
 *
 * This is best-effort: PayPal may still be finishing activation when onApprove
 * fires, in which case /api/webhooks/paypal (BILLING.SUBSCRIPTION.ACTIVATED)
 * does the flip a moment later. Either path is idempotent.
 */
export async function POST(request: Request) {
  if (!paypalConfigured()) {
    return NextResponse.json({ error: "paypal_not_configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let subscriptionId: string | undefined;
  try {
    ({ subscriptionId } = (await request.json()) as { subscriptionId?: string });
  } catch {
    /* handled below */
  }
  if (!subscriptionId) {
    return NextResponse.json({ error: "missing_subscription_id" }, { status: 400 });
  }

  let subscription: SubscriptionResource;
  try {
    subscription = await paypalRequest<SubscriptionResource>(
      `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`
    );
  } catch (err) {
    return NextResponse.json(
      { error: "paypal_lookup_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }

  if (subscription.custom_id && subscription.custom_id !== user.id) {
    return NextResponse.json({ error: "subscription_user_mismatch" }, { status: 403 });
  }

  const admin = createAdminClient();
  const isActive = subscription.status === "ACTIVE";
  const nextPaymentDate = toDateOnly(subscription.billing_info?.next_billing_time);

  const { data: reqRow } = await admin
    .from("subscription_requests")
    .select("id, user_id")
    .eq("paypal_subscription_id", subscriptionId)
    .maybeSingle();

  if (reqRow) {
    await admin
      .from("subscription_requests")
      .update({
        status: isActive ? "active" : "pending_payment",
        ...(nextPaymentDate ? { next_payment_date: nextPaymentDate } : {}),
      })
      .eq("id", reqRow.id);
  }

  if (isActive) {
    await admin
      .from("profiles")
      .update({ paid: true, subscription_status: "active" })
      .eq("id", user.id);
    await admin
      .from("blocked_companies")
      .update({ status: "active" })
      .eq("user_id", user.id)
      .eq("status", "pending_next_cycle");
  }

  return NextResponse.json({ ok: true, active: isActive });
}
