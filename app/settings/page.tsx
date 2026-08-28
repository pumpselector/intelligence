import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccess, hasFullAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import ChangePasswordSection from "@/components/settings/ChangePasswordSection";
import ContactSection from "@/components/settings/ContactSection";
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

  let blocked: BlockedCompany[] = [];
  if (paid) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("blocked_companies")
      .select("id, company_name, status, effective_from")
      .order("requested_at", { ascending: true });
    blocked = (data ?? []) as BlockedCompany[];
  }

  return (
    <main className="flex flex-1 flex-col bg-slate-50 px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">{access.email}</p>

        <ChangePasswordSection email={access.email} />

        <ContactSection />

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Blocked companies
          </h2>

          {paid ? (
            <BlockedCompaniesSection userId={access.userId} initial={blocked} />
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
