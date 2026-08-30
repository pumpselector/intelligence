import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PAYPAL_PLAN_IDS, paypalConfigured, paypalRequest } from "@/lib/paypal";
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
  pending_revision_approval_url: string | null;
};

type ReviseLink = { rel?: string; href?: string; method?: string };
type ReviseResponse = { links?: ReviseLink[]; plan_overridden?: boolean; status?: string };

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
 * Approval: a PayPal-funded subscription must have the buyer re-consent to any
 * pricing change. PayPal's /revise returns an `approve` HATEOAS link for that;
 * the new amount does NOT take effect (PayPal keeps billing the old one) until
 * the buyer visits it. We hand that link back to the caller AND persist it so
 * the Settings page can nag until it's done. A pure decrease that PayPal
 * applies without re-consent comes back with no `approve` link.
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
      "id, plan_type, monthly_price, blocked_company_count, paypal_subscription_id, pending_revised_block_count, pending_revised_price, pending_revision_approval_url"
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

  // A Standard subscriber leaving the fixed-price Standard plan for Blocking is
  // a PayPal PLAN CHANGE (a different plan_id), not just an amount revise — but
  // only once they've actually queued a billable block. Until then Standard is
  // unchanged and there's nothing to sync.
  const isPlanSwitch = sub.plan_type !== "blocking";
  const baseCount = sub.plan_type === "blocking" ? sub.blocked_company_count : 0;
  const basePrice = Number(sub.monthly_price);
  const rawNextCount = baseCount + (additions ?? 0) - (removals ?? 0);

  if (isPlanSwitch && rawNextCount < 1) {
    return NextResponse.json({ ok: true, unchanged: true, blockCount: 0, price: basePrice });
  }

  const nextCount = Math.max(1, rawNextCount);
  const nextPrice = blockingPrice(nextCount);

  // What PayPal's amount is currently queued to become: the last revision, or
  // the live plan amount if none is queued.
  const currentTargetPrice =
    sub.pending_revised_price != null ? Number(sub.pending_revised_price) : basePrice;
  // Only meaningful once already on Blocking — a revert to the paid baseline.
  const backToBaseline =
    !isPlanSwitch && nextCount === sub.blocked_company_count && nextPrice === basePrice;
  const hasOutstandingApproval = Boolean(sub.pending_revision_approval_url);

  // Nothing to do: the computed target already matches what's queued and
  // there's no half-finished approval to chase. A pending plan switch always
  // needs PayPal (the DB still says Standard), so it never short-circuits here.
  if (!isPlanSwitch && nextPrice === currentTargetPrice && !hasOutstandingApproval) {
    return NextResponse.json({ ok: true, unchanged: true, blockCount: nextCount, price: nextPrice });
  }

  const queuedFields = backToBaseline
    ? {
        pending_revised_block_count: null,
        pending_revised_price: null,
        pending_revised_plan_type: null,
        pending_revision_approval_url: null,
      }
    : {
        pending_revised_block_count: nextCount,
        pending_revised_price: nextPrice,
        pending_revised_plan_type: isPlanSwitch ? "blocking" : null,
      };

  // Can't talk to PayPal (no creds) or nothing to revise there (fallback-created
  // row) — record the target for the admin / webhook and stop. No approval step
  // in this path.
  if (!paypalConfigured() || !sub.paypal_subscription_id) {
    await admin
      .from("subscription_requests")
      .update({ ...queuedFields, pending_revision_approval_url: null })
      .eq("id", sub.id);
    return NextResponse.json({ ok: true, deferred: true, blockCount: nextCount, price: nextPrice });
  }

  // Every target of this route is the Blocking plan (a blocking subscriber
  // changing counts, or a Standard subscriber switching in). PayPal's /revise
  // rejects an inline `plan` pricing override unless `plan_id` is also sent —
  // "plan_id MISSING_REQUIRED_PARAMETER" — so it always goes on the request.
  const targetPlanId = PAYPAL_PLAN_IDS.blocking;
  if (!targetPlanId) {
    return NextResponse.json(
      { ok: false, error: "missing_blocking_plan_id", hint: "Set PAYPAL_BLOCKING_PLAN_ID" },
      { status: 500 }
    );
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://pumpradar24.com").replace(/\/$/, "");

  let revised: ReviseResponse;
  try {
    revised = await paypalRequest<ReviseResponse>(
      `/v1/billing/subscriptions/${encodeURIComponent(sub.paypal_subscription_id)}/revise`,
      {
        method: "POST",
        body: {
          // The plan to run the subscription on. Required by PayPal's /revise
          // whenever a `plan` pricing override is present, whether or not the
          // plan is actually changing. For a Standard->Blocking switch this is
          // the real change; for a blocking count change it's the same id.
          plan_id: targetPlanId,
          // Inline override of the Blocking plan's first regular cycle price to
          // base + 49,99 € × N. Same shape create-subscription uses.
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
          // Required for the buyer-approval redirect to work — without it PayPal
          // rejects the call / returns an approve link with nowhere to return to.
          application_context: {
            brand_name: "PumpRadar24",
            locale: "en-US",
            shipping_preference: "NO_SHIPPING",
            payment_method: {
              payer_selected: "PAYPAL",
              payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
            },
            return_url: `${siteUrl}/settings?revised=success`,
            cancel_url: `${siteUrl}/settings?revised=cancelled`,
          },
        },
      }
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[revise-subscription] PayPal /revise failed", {
      subscription: sub.paypal_subscription_id,
      nextCount,
      nextPrice,
      detail,
    });
    // Leave the DB untouched so the next attempt still sees a changed target
    // and retries rather than short-circuiting on "unchanged".
    return NextResponse.json(
      { ok: false, error: "paypal_revise_failed", detail },
      { status: 502 }
    );
  }

  const approvalUrl = revised.links?.find((l) => l.rel === "approve")?.href ?? null;

  console.log("[revise-subscription] PayPal /revise ok", {
    subscription: sub.paypal_subscription_id,
    nextCount,
    nextPrice,
    planOverridden: revised.plan_overridden ?? null,
    status: revised.status ?? null,
    needsApproval: Boolean(approvalUrl),
  });

  await admin
    .from("subscription_requests")
    .update({
      ...queuedFields,
      pending_revision_approval_url: backToBaseline ? null : approvalUrl,
    })
    .eq("id", sub.id);

  // A revert back to the paid baseline is a cancellation of the queued change —
  // don't send the user through an approval step for it even if PayPal offers
  // one for the (downward) adjustment.
  if (approvalUrl && !backToBaseline) {
    return NextResponse.json({
      ok: true,
      needsApproval: true,
      approvalUrl,
      blockCount: nextCount,
      price: nextPrice,
    });
  }

  return NextResponse.json({ ok: true, applied: true, blockCount: nextCount, price: nextPrice });
}
