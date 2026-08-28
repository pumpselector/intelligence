import Link from "next/link";
import type { AccessLevel } from "@/lib/access";

/**
 * Top-of-page status bar for the restricted data views. Rendered on the server
 * from the resolved access level; level 3 (full access) shows nothing.
 */
export default function AccessBanner({ level }: { level: AccessLevel }) {
  if (level === 3) return null;

  if (level === 0) {
    return (
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-[1440px] items-center justify-end gap-2 px-6 py-2.5 lg:px-10">
          <Link
            href="/login"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-white"
          >
            Log In
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Sign Up
          </Link>
        </div>
      </div>
    );
  }

  if (level === 1) {
    return (
      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto max-w-[1440px] px-6 py-2.5 lg:px-10">
          <p className="text-sm font-medium text-amber-800">
            Your account is pending admin approval.
          </p>
        </div>
      </div>
    );
  }

  // level === 2
  return (
    <div className="border-b border-sky-200 bg-sky-50">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-6 py-2.5 lg:px-10">
        <p className="text-sm font-medium text-sky-800">
          Your account is approved. Subscribe to unlock full access.
        </p>
        <Link
          href="/pricing"
          className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-700"
        >
          View Pricing
        </Link>
      </div>
    </div>
  );
}
