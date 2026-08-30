import Link from "next/link";
import LegalArticle from "@/components/LegalArticle";

export const metadata = {
  title: "Privacy Policy — PumpRadar24",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalArticle>
      <h1>Privacy Policy</h1>

      <p>
        <strong>Last updated: 30 August 2026</strong>
      </p>
      <p>
        This Privacy Policy explains how XLT Limited (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects
        and uses personal data when you use PumpRadar24 (pumpradar24.com). XLT Limited is the data
        controller. Our address and contact details are in the{" "}
        <Link href="/legal/impressum">Legal Notice</Link>.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li>
          <strong>Account information:</strong> your email address, your password (stored hashed by
          our authentication provider) and, where you provide it, your company name.
        </li>
        <li>
          <strong>Usage data:</strong> server logs, IP address, browser/device information and pages
          visited, generated automatically when you use the platform.
        </li>
        <li>
          <strong>Payment information:</strong> subscription payments are processed by PayPal. We
          receive a subscription identifier and status from PayPal; we do not receive or store your
          card or bank details.
        </li>
        <li>
          <strong>Contact form data:</strong> the email address, subject and message you submit
          through our contact form.
        </li>
      </ul>

      <h2>2. How we use your data</h2>
      <ul>
        <li>To create and manage your account, including admin approval of new accounts.</li>
        <li>To provide the service and the features of your subscription plan.</li>
        <li>To process subscription payments and renewals.</li>
        <li>To respond to support and contact requests.</li>
        <li>To detect, prevent and address technical issues, fraud or misuse.</li>
        <li>To comply with our legal obligations.</li>
      </ul>

      <h2>3. Third-party service providers</h2>
      <p>
        We share personal data with the following providers only as needed to run the service. Each
        has its own privacy policy governing its processing of your data:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — database and authentication (data hosted in the EU/US).
        </li>
        <li>
          <strong>Vercel</strong> — application hosting and content delivery.
        </li>
        <li>
          <strong>PayPal</strong> — payment processing.
        </li>
        <li>
          <strong>Resend</strong> — transactional and notification email delivery.
        </li>
      </ul>
      <p>We do not sell your personal data, and we do not use it for advertising.</p>

      <h2>4. Data retention</h2>
      <p>
        We keep your account data for as long as your account is active. After an account is closed
        or a deletion request is made, we remove or anonymise personal data except where we are
        required to retain certain records (for example billing and tax records) to meet legal
        obligations.
      </p>

      <h2>5. Your rights</h2>
      <p>
        Subject to applicable law, you have the right to access the personal data we hold about you,
        to have it corrected, to have it deleted, and to object to or restrict certain processing.
        You can request deletion of your account at any time from{" "}
        <Link href="/settings">your account settings</Link> (&ldquo;Delete my account&rdquo;), or by
        contacting us. To exercise any other right, email us at the address below.
      </p>

      <h2>6. Cookies</h2>
      <p>
        We use only essential cookies needed to keep you signed in and to operate the site. See our{" "}
        <Link href="/legal/cookie-policy">Cookie Policy</Link> for details.
      </p>

      <h2>7. International data transfers</h2>
      <p>
        XLT Limited is based in Hong Kong, and our service providers may process data in the EU, the
        US and other regions. Where personal data of users in the European Economic Area or the
        United Kingdom is transferred outside those areas, we rely on appropriate safeguards (such as
        the service providers&rsquo; standard contractual clauses) to protect it.
      </p>

      <h2>8. Contact</h2>
      <p>
        For any privacy question or request, contact us at{" "}
        <a href="mailto:dealers@pumpradar24.com">dealers@pumpradar24.com</a>.
      </p>
    </LegalArticle>
  );
}
