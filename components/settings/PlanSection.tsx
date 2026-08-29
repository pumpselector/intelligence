import Link from "next/link";
import { formatEur } from "@/lib/pricing";

export type PlanInfo = {
  plan_type: string;
  monthly_price: number;
  blocked_company_count: number;
  next_payment_date: string | null;
} | null;

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(iso)
  );
}

export default function PlanSection({
  plan,
  memberSince,
}: {
  plan: PlanInfo;
  memberSince: string | null;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Your plan</h2>

      {plan ? (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-slate-400">Plan</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {plan.plan_type === "blocking"
                ? `Blocking (${plan.blocked_company_count} ${
                    plan.blocked_company_count === 1 ? "company" : "companies"
                  })`
                : "Standard"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Monthly amount</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{formatEur(plan.monthly_price)}/month</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Member since</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {memberSince ? formatFullDate(memberSince) : "Not set yet"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Next payment date</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {plan.next_payment_date ? formatDate(plan.next_payment_date) : "Not set yet"}
            </dd>
          </div>
        </dl>
      ) : (
        <div className="mt-3 text-sm text-slate-600">
          You don&apos;t have an active plan yet.{" "}
          <Link href="/pricing" className="font-medium text-amber-700 hover:text-amber-800">
            View pricing
          </Link>
        </div>
      )}
    </section>
  );
}
