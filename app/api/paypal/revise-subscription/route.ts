import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paypalConfigured, paypalRequest } from "@/lib/paypal";
import { blockingPrice } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ActiveSub = {
  id: string;
  plan_type: string;
  monthly_price: number;
  blocked_company_count: number;
  paypal_subscription_id: string | null;
  pending_revised_block_count: number | null;
  pending_revised_price: number | null;
};

type ReviseLink = { rel?: string; href?: string };

/**
 * Re-syncs the PayPal subscription amount to the caller's current block-list
 * config. Called (with no body needed) after any billing-affecting change in
 * the Settings block list.
 *
 * Next-cycle count is computed authoritatively from the DB, never trusted from
 * the client:
 *   nextCount = blocked_company_count
 *             + rows queued as billable additions ("+ Add another company")
 *             - rows flagged removed_pending that were part of the paid slots
 * then the new monthly amount is `blockingPrice(nextCount)`.
 *
 * Timing: we call PayPal's /revise immediately. A pricing-only revision via the
 * inline billing_cycles override does NOT prorate or charge now — PayPal applies
 * it from the next billing cycle. Calling it now (rather than near the renewal
 * date, which would need a scheduler we don't have) also means any required
 * buyer approval happens while the user is still in the flow; we return that
 * approval URL when PayPal asks for it.
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
    .select(
      "id, plan_type, monthly_price, blocked_company_count, paypal_subscription_id, pending_revised_block_count, pending_revised_price"
    )
    .eq("user_id", user.id)
    .in("status", ["active", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ActiveSub>();

  if (!sub) {
    return NextResponse.json({ error: "no_active_subscription" }, { status: 404 });
  }

  // Count the next-cycle slots from the block list itself.
  const [{ count: additions }, { count: removals }] = await Promise.all([
    admin
      .from("blocked_companies")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending_next_cycle")
      .eq("is_billable_addition", true),
    admin
      .from("blocked_companies")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "removed_pending")
      .eq("is_billable_addition", false),
  ]);

  const baseCount = sub.plan_type === "blocking" ? sub.blocked_company_count : 0;
  const basePrice = Number(sub.monthly_price);
  const nextCount = Math.max(1, baseCount + (additions ?? 0) - (removals ?? 0));
  const nextPrice = blockingPrice(nextCount);

  // What PayPal's amount is currently set to: the last queued revision, or the
  // live plan amount if none is queued.
  const currentTargetPrice =
    sub.pending_revised_price != null ? Number(sub.pending_revised_price) : basePrice;
  const backToBaseline = nextCount === sub.blocked_company_count && nextPrice === basePrice;

  // Persist (or clear) the queued target — it's the source of truth for the
  // webhook and for an admin when PayPal isn't wired up yet.
  await admin
    .from("subscription_requests")
    .update(
      backToBaseline
        ? { pending_revised_block_count: null, pending_revised_price: null }
        : { pending_revised_block_count: nextCount, pending_revised_price: nextPrice }
    )
    .eq("id", sub.id);

  if (nextPrice === currentTargetPrice) {
    return NextResponse.json({ ok: true, unchanged: true, blockCount: nextCount, price: nextPrice });
  }

  // Can't talk to PayPal (no creds) or nothing to revise (fallback-created row,
  // or a Standard plan being upgraded) — leave it for the admin to reconcile.
  if (!paypalConfigured() || !sub.paypal_subscription_id || sub.plan_type !== "blocking") {
    return NextResponse.json({
      ok: true,
      deferred: true,
      blockCount: nextCount,
      price: nextPrice,
    });
  }

  try {
    const revised = await paypalRequest<{ links?: ReviseLink[] }>(
      `/v1/billing/subscriptions/${encodeURIComponent(sub.paypal_subscription_id)}/revise`,
      {
        method: "POST",
        body: {
          plan: {
            billing_cycles: [
              {
                sequence: 1,
                total_cycles: 0,
                pricing_scheme: {
                  fixed_price: { value: nextPrice.toFixed(2), currency_code: "EUR" },
                },
              },
            ],
          },
        },
      }
    );

    const approvalUrl =
      revised.links?.find((l) => l.rel === "approve")?.href ?? null;

    return NextResponse.json({
      ok: true,
      blockCount: nextCount,
      price: nextPrice,
      approvalUrl,
    });
  } catch (err) {
    // The target is already stored; surface the failure but don't 500 the UI.
    return NextResponse.json(
      {
        ok: true,
        deferred: true,
        blockCount: nextCount,
        price: nextPrice,
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 200 }
    );
  }
}
