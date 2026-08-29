import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paypalConfigured, paypalRequest } from "@/lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ActiveSub = {
  id: string;
  paypal_subscription_id: string | null;
  next_payment_date: string | null;
};

/**
 * "Cancel subscription" from Settings.
 *
 * PayPal's /cancel is immediate (status -> CANCELLED, no more billing) and emits
 * no further lifecycle events, so the "keep access until the period end" grace
 * is our own: we keep profiles.paid = true and set profiles.access_until to the
 * current next_payment_date. getAccess() downgrades the user once that date
 * passes — no scheduled job required.
 *
 * We flip the local state BEFORE calling PayPal so the CANCELLED webhook (which
 * follows within seconds) sees cancel_at_period_end = true and doesn't yank
 * access early.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("subscription_requests")
    .select("id, paypal_subscription_id, next_payment_date")
    .eq("user_id", user.id)
    .in("status", ["active", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ActiveSub>();

  if (!sub) {
    return NextResponse.json({ error: "no_active_subscription" }, { status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const accessUntil = sub.next_payment_date && sub.next_payment_date >= today ? sub.next_payment_date : today;

  await admin
    .from("subscription_requests")
    .update({
      status: "cancelled",
      cancel_at_period_end: true,
      pending_revised_block_count: null,
      pending_revised_price: null,
    })
    .eq("id", sub.id);

  await admin
    .from("profiles")
    .update({ subscription_status: "cancelled", access_until: accessUntil })
    .eq("id", user.id);

  // Payment stops -> the competitor block list goes (the per-company fee ends
  // now). Data access is what continues until access_until.
  await admin.from("blocked_companies").delete().eq("user_id", user.id);

  let paypalCancelled = false;
  let detail: string | undefined;
  if (paypalConfigured() && sub.paypal_subscription_id) {
    try {
      await paypalRequest(
        `/v1/billing/subscriptions/${encodeURIComponent(sub.paypal_subscription_id)}/cancel`,
        { method: "POST", body: { reason: "Cancelled from account settings" } }
      );
      paypalCancelled = true;
    } catch (err) {
      detail = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json({ ok: true, accessUntil, paypalCancelled, detail });
}
