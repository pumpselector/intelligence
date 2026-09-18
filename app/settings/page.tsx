import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccess, hasFullAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import ChangePasswordSection from "@/components/settings/ChangePasswordSection";
import ContactSection from "@/components/settings/ContactSection";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";
import PlanSection, { type PlanInfo } from "@/components/settings/PlanSection";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings — PumpRadar24",
};

export default async function SettingsPage() {
  const access = await getAccess();

  if (access.level === 0 || !access.userId) redirect("/login");

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

        <DeleteAccountSection />
      </div>
    </main>
  );
}
