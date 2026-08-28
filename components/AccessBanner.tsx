import Link from "next/link";
import type { AccessLevel } from "@/lib/access";

type Props = {
  level: AccessLevel;
  emailVerified: boolean;
};

/**
 * Prominent status bar shown directly under the header on /intelligence and
 * /news only (never the home page). Level 3 (full access) shows nothing.
 * The level-2 "View Pricing" link is the only pricing entry point in the chrome
 * (the header has none), so it stays a link, not a redundant button.
 */
export default function AccessBanner({ level, emailVerified }: Props) {
  if (level === 3) return null;

  let message: string;
  let pricingLink = false;
  if (level === 0) {
    message = "Sign up and subscribe to view pump producer and dealer details.";
  } else if (level === 1 && !emailVerified) {
    message = "Please confirm your email address to continue.";
  } else if (level === 1) {
    message = "Your account is pending admin approval.";
  } else {
    // level === 2
    message = "Your account is approved. Subscribe to unlock full access.";
    pricingLink = true;
  }

  return (
    <div className="border-b border-amber-300 bg-amber-100">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-2 gap-y-1 px-6 py-2.5 lg:px-10">
        <p className="text-sm font-medium text-amber-900">{message}</p>
        {pricingLink && (
          <Link
            href="/pricing"
            className="text-sm font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950"
          >
            View Pricing
          </Link>
        )}
      </div>
    </div>
  );
}
