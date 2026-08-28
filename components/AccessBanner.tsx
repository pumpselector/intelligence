import Link from "next/link";
import type { AccessLevel } from "@/lib/access";

type Props = {
  level: AccessLevel;
  emailVerified: boolean;
};

/**
 * Prominent status bar shown directly under the header on /intelligence and
 * /news only (never the home page). Level 3 (full access) shows nothing.
 */
export default function AccessBanner({ level, emailVerified }: Props) {
  if (level === 3) return null;

  let message: string;
  let action: { href: string; label: string } | null = null;

  if (level === 0) {
    message = "Sign up and subscribe to view manufacturer and dealer details.";
    action = { href: "/login", label: "Sign Up" };
  } else if (level === 1 && !emailVerified) {
    message = "Please confirm your email address to continue.";
  } else if (level === 1) {
    message = "Your account is pending admin approval.";
  } else {
    // level === 2
    message = "Your account is approved. Subscribe to unlock full access.";
    action = { href: "/pricing", label: "View Pricing" };
  }

  return (
    <div className="border-b border-amber-300 bg-amber-100">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-2.5 lg:px-10">
        <p className="text-sm font-medium text-amber-900">{message}</p>
        {action && (
          <Link
            href={action.href}
            className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
          >
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
