import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Subscription — PumpRadar24",
};

export default async function SubscribeThanksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // PayPal activates the subscription in real time (activate-subscription route +
  // webhook flip profiles.paid), so by the time the buyer lands here `paid` is
  // usually already true. The old "finalizing payment setup" copy only fits the
  // fallback flow (PayPal not configured), where activation is a manual step.
  let paid = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("paid")
      .eq("id", user.id)
      .single();
    paid = Boolean(profile?.paid);
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-24">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
          ✓
        </div>

        {paid ? (
          <>
            <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
              You&apos;re all set! Your subscription is now active.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Full access to pump producer and pump dealer details is unlocked. A payment
              receipt is on its way to your inbox.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
              Thanks! Your subscription request has been received.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              We&apos;re finalizing payment setup — you&apos;ll receive an email as soon as your
              account is activated.
            </p>
          </>
        )}

        <Link
          href="/intelligence"
          className="mt-6 inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {paid ? "Go to data explorer" : "Back to data explorer"}
        </Link>
      </div>
    </main>
  );
}
