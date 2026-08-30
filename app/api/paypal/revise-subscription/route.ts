import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DISABLED — kept only for reference.
 *
 * This endpoint used to re-sync a PayPal subscription's amount to the user's
 * current block-list config (PayPal /revise + a buyer-approval redirect flow).
 * That automation was removed: block-list and plan changes are now handled
 * manually by the PumpRadar24 team (they adjust PayPal + Supabase by hand off
 * the back of an email). Nothing in the app calls this route any more.
 *
 * If we ever automate revisions again, restore the implementation from git
 * history (commit that introduced 0015_subscription_revision_approval_url).
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "manual_only",
      message:
        "Plan changes are now handled manually by the PumpRadar24 team. Please email dealers@pumpradar24.com.",
    },
    { status: 410 }
  );
}
