import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BASE_PRICE, blockingPrice, type PlanType } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fallback subscription flow — used only when PayPal isn't configured
 * (NEXT_PUBLIC_PAYPAL_CLIENT_ID empty). Records a `pending_payment` row in
 * subscription_requests for an admin to activate by hand, plus the buyer's
 * blocked-company list.
 *
 * This used to be a direct `supabase.from(...).insert(...)` from the browser
 * (components/PricingClient.tsx). That path is gone: migration 0022 removed the
 * client INSERT policy, so all writes to these tables now go through this
 * service-role route, which re-checks approval and computes the price itself.
 */

type Body = {
  plan?: string;
  blockCount?: number;
  companies?: unknown;
};

const MAX_COMPANY_NAME_LEN = 200;

/** Drop repeated company names (case-insensitive), keeping first occurrence. */
function dedupeNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const key = name.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Hard gate: only an admin-approved user may start a subscription. The
  // /pricing UI already hides the buttons for everyone else, but that's
  // bypassable — this is the real check (same rule as
  // /api/paypal/create-subscription).
  const { data: profile } = await supabase
    .from("profiles")
    .select("approved")
    .eq("id", user.id)
    .single();
  if (!profile?.approved) {
    return NextResponse.json({ error: "not_approved" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const plan: PlanType = body.plan === "blocking" ? "blocking" : "standard";
  const blockCount =
    plan === "blocking" ? Math.max(1, Math.floor(Number(body.blockCount) || 0)) : 0;

  const companies = Array.isArray(body.companies)
    ? dedupeNames(
        body.companies
          .map((c) => String(c).trim())
          .filter((c) => c.length > 0 && c.length <= MAX_COMPANY_NAME_LEN)
      ).slice(0, blockCount)
    : [];

  // Price is computed here, never taken from the client.
  const monthlyPrice = plan === "blocking" ? blockingPrice(blockCount) : BASE_PRICE;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "server_not_configured" }, { status: 503 });
  }

  // Clear any earlier fallback attempt this user abandoned (no PayPal id), so
  // repeated submissions don't pile up duplicate rows / blocked companies.
  // ON DELETE CASCADE (migration 0017) removes the linked blocked_companies.
  await admin
    .from("subscription_requests")
    .delete()
    .eq("user_id", user.id)
    .eq("status", "pending_payment")
    .is("paypal_subscription_id", null);

  // First-ever active subscription? Then blocked companies take effect
  // immediately instead of waiting for a billing cycle.
  const { count: activeCount } = await admin
    .from("subscription_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "active");
  const isFirstSubscription = (activeCount ?? 0) === 0;

  const { data: reqRow, error: reqError } = await admin
    .from("subscription_requests")
    .insert({
      user_id: user.id,
      plan_type: plan,
      monthly_price: monthlyPrice,
      blocked_company_count: blockCount,
      status: "pending_payment",
    })
    .select("id")
    .single();
  if (reqError || !reqRow) {
    return NextResponse.json(
      { error: "db_insert_failed", detail: reqError?.message },
      { status: 500 }
    );
  }

  if (companies.length > 0) {
    const { error: blockError } = await admin.from("blocked_companies").insert(
      companies.map((company_name) => ({
        user_id: user.id,
        company_name,
        status: isFirstSubscription ? "active" : "pending_next_cycle",
        subscription_request_id: reqRow.id,
      }))
    );
    if (blockError) {
      return NextResponse.json(
        { error: "blocked_companies_insert_failed", detail: blockError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
