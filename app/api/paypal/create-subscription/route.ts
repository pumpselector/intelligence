import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PAYPAL_PLAN_IDS, paypalConfigured, paypalRequest } from "@/lib/paypal";
import { BASE_PRICE, blockingPrice, type PlanType } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  plan?: string;
  blockCount?: number;
  companies?: unknown;
};

/**
 * Creates a PayPal subscription for the signed-in user and records a
 * `pending_payment` row in subscription_requests. The browser SDK's
 * `createSubscription` callback calls this and hands the returned id to PayPal
 * for approval; the real activation happens in /api/paypal/activate-subscription
 * (on approve) and /api/webhooks/paypal (authoritative).
 *
 * Blocking plan: PayPal plans are fixed-price, so we send the base
 * PAYPAL_BLOCKING_PLAN_ID plus an inline `plan.billing_cycles` override that
 * sets the first regular cycle price to base + 49,99 € × N.
 */
export async function POST(request: Request) {
  if (!paypalConfigured()) {
    // The client gates on NEXT_PUBLIC_PAYPAL_CLIENT_ID and shouldn't reach here,
    // but answer explicitly so it can fall back if it does.
    return NextResponse.json({ error: "paypal_not_configured", fallback: true }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
    ? body.companies
        .map((c) => String(c).trim())
        .filter((c) => c.length > 0)
        .slice(0, blockCount)
    : [];

  const planId = PAYPAL_PLAN_IDS[plan];
  if (!planId) {
    return NextResponse.json(
      { error: `missing_plan_id:${plan}`, hint: `Set PAYPAL_${plan.toUpperCase()}_PLAN_ID` },
      { status: 500 }
    );
  }

  const monthlyPrice = plan === "blocking" ? blockingPrice(blockCount) : BASE_PRICE;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://pumpradar24.com").replace(/\/$/, "");

  const subscriptionBody: Record<string, unknown> = {
    plan_id: planId,
    // Echoed back on every subscription webhook — lets the webhook map the
    // subscription to a user even if the DB insert below somehow lost the race.
    custom_id: user.id,
    subscriber: user.email ? { email_address: user.email } : undefined,
    application_context: {
      brand_name: "PumpRadar24",
      shipping_preference: "NO_SHIPPING_ADDRESS",
      user_action: "SUBSCRIBE_NOW",
      payment_method: {
        payer_selected: "PAYPAL",
        payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
      },
      return_url: `${siteUrl}/subscribe/thanks`,
      cancel_url: `${siteUrl}/pricing`,
    },
  };

  if (plan === "blocking") {
    subscriptionBody.plan = {
      billing_cycles: [
        {
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: monthlyPrice.toFixed(2), currency_code: "EUR" },
          },
        },
      ],
    };
  }

  let subscription: { id: string; status: string };
  try {
    subscription = await paypalRequest<{ id: string; status: string }>(
      "/v1/billing/subscriptions",
      { method: "POST", body: subscriptionBody }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "paypal_create_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }

  const admin = createAdminClient();

  // First-ever active subscription for this user? Then blocked companies take
  // effect immediately rather than waiting for a billing cycle (matches the
  // rule the fallback flow already uses).
  const { count: activeCount } = await admin
    .from("subscription_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "active");
  const isFirstSubscription = (activeCount ?? 0) === 0;

  const { error: reqError } = await admin.from("subscription_requests").insert({
    user_id: user.id,
    plan_type: plan,
    monthly_price: monthlyPrice,
    blocked_company_count: blockCount,
    status: "pending_payment",
    paypal_subscription_id: subscription.id,
  });
  if (reqError) {
    return NextResponse.json({ error: "db_insert_failed", detail: reqError.message }, { status: 500 });
  }

  if (companies.length > 0) {
    await admin.from("blocked_companies").insert(
      companies.map((company_name) => ({
        user_id: user.id,
        company_name,
        status: isFirstSubscription ? "active" : "pending_next_cycle",
      }))
    );
  }

  return NextResponse.json({ subscriptionId: subscription.id });
}
