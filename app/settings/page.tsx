import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccess, hasFullAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import ChangePasswordSection from "@/components/settings/ChangePasswordSection";
import ContactSection from "@/components/settings/ContactSection";
import PlanSection, { type PlanInfo } from "@/components/settings/PlanSection";
import BlockedCompaniesSection, {
  type BlockedCompany,
} from "@/components/settings/BlockedCompaniesSection";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings — PumpRadar24",
};

export default async function SettingsPage() {
  const access = await getAccess();

  if (access.level === 0 || !access.userId) redirect("/login");

  const paid = hasFullAccess(access.level);
  const supabase = await createClient();

  const [{ data: profile }, { data: latestRequest }] = await Promise.all([
    supabase.from("profiles").select("created_at").eq("id", access.userId).single(),
    supabase
      .from("subscription_requests")
      .select(
        "plan_type, monthly_price, blocked_company_count, next_payment_date, status, cancel_at_period_end"
      )
      .in("status", ["active", "pending_payment", "past_due", "cancelled"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const plan: PlanInfo = latestRequest ?? null;
  const subscriptionCancelled = plan?.status === "cancelled";

  let blocked: BlockedCompany[] = [];
  let slotCount = 0;

  if (paid && !subscriptionCancelled) {
    const { data: blockedData } = await supabase
      .from("blocked_companies")
      .select(
        "id, company_name, status, effective_from, requested_at, active_until, is_billable_addition"
      )
      .order("requested_at", { ascending: true });
    blocked = (blockedData ?? []) as BlockedCompany[];
    slotCount = plan?.blocked_company_count ?? 0;
  }

  return (
    <main className="flex flex-1 flex-col bg-slate-50 px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">{access.email}</p>

        <div className="mt-6">
          <PlanSection plan={plan} memberSince={profile?.created_at ?? null} />
        </div>

        <ChangePasswordSection email={access.email} />

        <ContactSection />

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Blocked companies
          </h2>

          {paid && subscriptionCancelled ? (
            <p className="mt-3 text-sm text-slate-600">
              Your subscription is cancelled — competitor blocking has ended.
            </p>
          ) : paid ? (
            <BlockedCompaniesSection
              userId={access.userId}
              slotCount={slotCount}
              initial={blocked}
            />
          ) : (
            <div className="mt-3 text-sm text-slate-600">
              Competitor blocking is part of a paid subscription.{" "}
              <Link href="/pricing" className="font-medium text-amber-700 hover:text-amber-800">
                View pricing
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
