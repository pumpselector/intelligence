import Link from "next/link";

export const metadata = {
  title: "Pricing — PumpRadar24",
};

/** Placeholder — plans and checkout land here in Phase 2. */
export default function PricingPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-24">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Pricing</h1>
        <p className="mt-3 text-sm text-slate-500">
          Subscription plans are coming soon. Your account already has preview access — full
          manufacturer and dealer data unlocks once billing is live.
        </p>
        <Link
          href="/intelligence"
          className="mt-6 inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white"
        >
          Back to data explorer
        </Link>
      </div>
    </main>
  );
}
