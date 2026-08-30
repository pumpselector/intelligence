import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedSubscription, paypalConfigured, paypalRequest } from "@/lib/paypal";

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
 * We SUSPEND the PayPal subscription rather than cancelling it: suspend stops
 * all billing but stays reversible via PayPal's /activate, so the user can
 * "Reactivate subscription" later (see /api/paypal/reactivate-subscription).
 * A suspended subscription the user never revives just sits paused forever —
 * no charges — and an admin can hard-cancel it in PayPal if they want to tidy up.
 *
 * The "keep access until the period end" grace is our own: profiles.paid stays
 * true and profiles.access_until is set to the current next_payment_date;
 * getAccess() downgrades the user once that date passes — no scheduled job.
 *
 * Local state is flipped BEFORE calling PayPal so the SUSPENDED webhook that
 * follows sees cancel_at_period_end = true and treats it as user-initiated.
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

  // Defence in depth: the row is already scoped to user_id and (since migration
  // 0022) can only have been written by our own server routes, but if PayPal is
  // live also confirm the subscription's custom_id is this user before we ever
  // hit PayPal's suspend API. Nothing has been mutated yet at this point.
  if (paypalConfigured() && sub.paypal_subscription_id) {
    const owned = await getOwnedSubscription(sub.paypal_subscription_id, user.id);
    if (!owned) {
      return NextResponse.json({ error: "subscription_ownership_mismatch" }, { status: 403 });
    }
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

  // The block list stays active for as long as the user's data access does
  // (until access_until). Never delete the rows — the team keeps them for
  // reference — just stamp when they stop counting.
  await admin
    .from("blocked_companies")
    .update({ deactivated_at: new Date(`${accessUntil}T00:00:00Z`).toISOString() })
    .eq("user_id", user.id)
    .is("deactivated_at", null);

  let paypalSuspended = false;
  let detail: string | undefined;
  if (paypalConfigured() && sub.paypal_subscription_id) {
    try {
      await paypalRequest(
        `/v1/billing/subscriptions/${encodeURIComponent(sub.paypal_subscription_id)}/suspend`,
        { method: "POST", body: { reason: "Cancelled from account settings" } }
      );
      paypalSuspended = true;
    } catch (err) {
      detail = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json({ ok: true, accessUntil, paypalSuspended, detail });
}
