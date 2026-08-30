import Link from "next/link";
import LegalArticle from "@/components/LegalArticle";

export const metadata = {
  title: "Terms of Service — PumpRadar24",
};

export default function TermsPage() {
  return (
    <LegalArticle>
      <h1>Terms of Service</h1>

      <p>
        <strong>Last updated: 30 August 2026</strong>
      </p>
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of PumpRadar24
        (pumpradar24.com), operated by XLT Limited (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating
        an account or using the platform you agree to these Terms.
      </p>

      <h2>1. The service</h2>
      <p>
        PumpRadar24 is a subscription-based platform that provides market intelligence on the pump
        industry, including data on pump producers, pump dealers and changes to dealer networks.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>You must provide accurate information when you register and keep it up to date.</li>
        <li>
          New accounts require approval by an administrator before full access is granted.
        </li>
        <li>
          Registration requires a business email address. Sign-ups from generic or free email
          providers may be rejected.
        </li>
        <li>You are responsible for keeping your login credentials confidential.</li>
      </ul>

      <h2>3. Subscriptions and payment</h2>
      <ul>
        <li>
          We offer a <strong>Standard</strong> plan and a <strong>Blocking</strong> plan, billed
          monthly.
        </li>
        <li>
          Subscriptions renew automatically each month and are charged through PayPal until
          cancelled.
        </li>
        <li>
          You can cancel at any time from your account settings. On cancellation, access continues
          until the end of the paid period; we do not provide pro-rata refunds for partial periods.
        </li>
      </ul>

      <h2>4. Blocking plan</h2>
      <p>
        The Blocking plan lets you request that named competitor companies are not admitted to the
        platform. This is managed manually by our team on a best-effort basis. We do not guarantee a
        specific service level, response time or outcome for blocking requests.
      </p>

      <h2>5. Acceptable use</h2>
      <ul>
        <li>Do not share, redistribute, publish or resell the data or any part of the platform.</li>
        <li>Do not use the data for any commercial resale or data-brokering purpose.</li>
        <li>
          Do not scrape, crawl or use automated means to extract data, and do not attempt to
          circumvent access controls or rate limits.
        </li>
        <li>Do not use the platform to break the law or infringe the rights of others.</li>
      </ul>

      <h2>6. Intellectual property</h2>
      <p>
        The platform, its content, data compilations and design are owned by XLT Limited or its
        licensors. Your subscription grants you a limited, non-transferable right to access and use
        the platform for your own internal business purposes only.
      </p>

      <h2>7. Disclaimer and limitation of liability</h2>
      <p>
        The platform and all data are provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;,
        without warranty of any kind. We do not warrant that the data is accurate, complete or
        current. To the maximum extent permitted by law, XLT Limited is not liable for any indirect,
        incidental or consequential loss, or for any loss of profit, revenue or data, arising from
        your use of or reliance on the platform.
      </p>

      <h2>8. Suspension and termination</h2>
      <p>
        We may suspend or close your account if you breach these Terms, misuse the platform, or fail
        to pay. You may stop using the service at any time by cancelling your subscription and
        requesting deletion of your account.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These Terms are governed by the laws of Hong Kong, and any dispute relating to them is
        subject to the exclusive jurisdiction of the courts of Hong Kong.
      </p>

      <h2>10. Changes and contact</h2>
      <p>
        We may update these Terms from time to time; material changes will be notified through the
        platform. See also our <Link href="/legal/privacy-policy">Privacy Policy</Link>. Questions?
        Contact <a href="mailto:dealers@pumpradar24.com">dealers@pumpradar24.com</a>.
      </p>
    </LegalArticle>
  );
}
