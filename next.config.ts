import type { NextConfig } from "next";

/**
 * Baseline security headers, applied to every response.
 *
 * A full Content-Security-Policy is deliberately NOT set here yet: it needs
 * careful tuning against the PayPal SDK (script + frames from paypal.com),
 * Supabase and Resend, and a wrong policy silently breaks the PayPal buttons.
 * That is handled in a separate pass.
 */
const securityHeaders = [
  // No page in this app is ever meant to be framed (the PayPal SDK frames its
  // own iframe *into* our page, not the other way round).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    // 2 years. Add "; preload" once every *.pumpradar24.com host is HTTPS-only
    // and the domain is submitted to hstspreload.org.
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  images: {
    // Serve AVIF to browsers that support it (smaller than WebP), fall back to
    // WebP otherwise. Applies to every next/image-optimized asset.
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
