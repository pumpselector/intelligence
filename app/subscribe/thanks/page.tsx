import Link from "next/link";

export const metadata = {
  title: "Subscription request received — PumpRadar24",
};

export default function SubscribeThanksPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-24">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
          ✓
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
          Thanks! Your subscription request has been received.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          We&apos;re finalizing payment setup — you&apos;ll receive an email as soon as your account
          is activated.
        </p>
        <Link
          href="/intelligence"
          className="mt-6 inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Back to data explorer
        </Link>
      </div>
    </main>
  );
}
