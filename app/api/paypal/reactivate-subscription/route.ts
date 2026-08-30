import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedSubscription, paypalConfigured, paypalRequest } from "@/lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CancelledSub = {
  id: string;
  paypal_subscription_id: string | null;
  cancel_at_period_end: boolean | null;
};

/**
 * "Reactivate subscription" from Settings — the undo for a user-initiated
 * cancel (which suspends rather than cancels the PayPal subscription, see
 * /api/paypal/cancel-subscription).
 *
 * PayPal's /activate is called FIRST: if the subscription can't be revived
 * (PayPal-side cancelled / expired) we return an error and leave our records
 * untouched. On success we flip the local state back to active; the
 * BILLING.SUBSCRIPTION.ACTIVATED webhook that follows re-applies the same
 * changes idempotently.
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
    .select("id, paypal_subscription_id, cancel_at_period_end")
    .eq("user_id", user.id)
    .eq("status", "cancelled")
    .eq("cancel_at_period_end", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<CancelledSub>();

  if (!sub) {
    return NextResponse.json({ error: "no_reactivatable_subscription" }, { status: 404 });
  }

  // Defence in depth (see /api/paypal/cancel-subscription): confirm the PayPal
  // subscription's custom_id is this user before calling PayPal's activate API.
  if (paypalConfigured() && sub.paypal_subscription_id) {
    const owned = await getOwnedSubscription(sub.paypal_subscription_id, user.id);
    if (!owned) {
      return NextResponse.json({ error: "subscription_ownership_mismatch" }, { status: 403 });
    }
  }

  if (paypalConfigured() && sub.paypal_subscription_id) {
    try {
      await paypalRequest(
        `/v1/billing/subscriptions/${encodeURIComponent(sub.paypal_subscription_id)}/activate`,
        { method: "POST", body: { reason: "Reactivated from account settings" } }
      );
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        {
          ok: false,
          error: "paypal_activate_failed",
          detail,
          hint: "The PayPal subscription can no longer be revived — start a new subscription instead.",
        },
        { status: 502 }
      );
    }
  }

  await admin
    .from("subscription_requests")
    .update({ status: "active", cancel_at_period_end: false })
    .eq("id", sub.id);

  await admin
    .from("profiles")
    .update({ subscription_status: "active", access_until: null })
    .eq("id", user.id);

  // Restore the block list rows we stamped on cancel.
  await admin
    .from("blocked_companies")
    .update({ deactivated_at: null })
    .eq("user_id", user.id)
    .not("deactivated_at", "is", null);

  return NextResponse.json({ ok: true });
}
