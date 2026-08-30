import Link from "next/link";

export const metadata = {
  title: "Check your email — PumpRadar24",
};

export const dynamic = "force-dynamic";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-24">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
          ✉️
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">Check your email</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          We sent a confirmation link to{" "}
          <span className="font-medium text-slate-900">{email || "your email address"}</span>. Click it
          to verify your account, then wait for admin approval before signing in.
        </p>
        <p className="mt-3 text-xs text-slate-400">
          No email after a few minutes? Check your spam folder, or return to sign in and request a new
          confirmation link.
        </p>
        <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
          If you already have an account with this email, please sign in instead — or use{" "}
          <Link href="/forgot-password" className="font-medium text-slate-700 hover:text-slate-900">
            Forgot password
          </Link>{" "}
          if you don&apos;t remember your password.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
