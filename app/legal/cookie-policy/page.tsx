import Link from "next/link";
import LegalArticle from "@/components/LegalArticle";

export const metadata = {
  title: "Cookie Policy — PumpRadar24",
};

export default function CookiePolicyPage() {
  return (
    <LegalArticle>
      <h1>Cookie Policy</h1>

      <p>
        <strong>Last updated: 30 August 2026</strong>
      </p>
      <p>
        PumpRadar24 (operated by XLT Limited) uses cookies and similar browser storage only where
        they are necessary for the site to function.
      </p>

      <h2>1. Essential cookies</h2>
      <ul>
        <li>
          <strong>Authentication:</strong> our authentication provider (Supabase) sets cookies to
          keep you signed in and to protect your session.
        </li>
        <li>
          <strong>Preferences:</strong> local browser storage remembers small choices such as
          dismissing the cookie notice.
        </li>
      </ul>

      <h2>2. What we do not use</h2>
      <p>
        We do not use analytics, tracking, profiling or advertising cookies, and we do not share
        cookie data with third parties for those purposes.
      </p>

      <h2>3. Managing cookies</h2>
      <p>
        You can block or delete cookies in your browser settings. If you block essential cookies you
        will not be able to sign in or use the platform.
      </p>

      <h2>4. Changes</h2>
      <p>
        If we ever introduce non-essential cookies (for example analytics), we will update this
        policy and ask for your consent first.
      </p>

      <p>
        See our <Link href="/legal/privacy-policy">Privacy Policy</Link> for how we handle personal
        data, or contact us at{" "}
        <a href="mailto:dealers@pumpradar24.com">dealers@pumpradar24.com</a>.
      </p>
    </LegalArticle>
  );
}
