import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccess, hasFullAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings — PumpRadar24",
};

type BlockedCompany = {
  id: string;
  company_name: string;
  status: string;
  effective_from: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending_next_cycle: "starts next billing cycle",
  active: "active",
  removed_pending: "removal pending",
};

export default async function SettingsPage() {
  const access = await getAccess();

  if (access.level === 0) redirect("/login");

  const paid = hasFullAccess(access.level);

  return (
    <main className="flex flex-1 flex-col bg-slate-50 px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">{access.email}</p>

        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Blocked companies
          </h2>

          {!paid ? (
            <div className="mt-3 text-sm text-slate-600">
              Competitor blocking is part of a paid subscription.{" "}
              <Link href="/pricing" className="font-medium text-amber-700 hover:text-amber-800">
                View pricing
              </Link>
            </div>
          ) : (
            <BlockedList />
          )}
        </section>
      </div>
    </main>
  );
}

async function BlockedList() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blocked_companies")
    .select("id, company_name, status, effective_from")
    .order("requested_at", { ascending: true });

  const companies = (data ?? []) as BlockedCompany[];

  if (companies.length === 0) {
    return (
      <p className="mt-3 text-sm text-slate-500">
        You haven&apos;t blocked any companies yet. You&apos;ll be able to add and edit this list here
        soon.
      </p>
    );
  }

  return (
    <ul className="mt-3 divide-y divide-slate-100">
      {companies.map((c) => (
        <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
          <span className="text-sm font-medium text-slate-800">{c.company_name}</span>
          <span className="text-xs text-slate-400">
            {STATUS_LABEL[c.status] ?? c.status}
            {c.effective_from ? ` · effective from ${c.effective_from}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
