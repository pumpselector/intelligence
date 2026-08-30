"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "cookie_consent_ack";

/**
 * One-time informational cookie notice. We only use essential cookies, so this
 * is a notice, not a GDPR opt-in gate. If tracking/analytics cookies are ever
 * added, this must become a real consent mechanism.
 */
export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "1") setShow(true);
    } catch {
      // storage blocked — just don't show the banner
    }
  }, []);

  function acknowledge() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore — worst case the banner shows again next visit
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-col items-start gap-3 px-6 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <p className="leading-relaxed">
          We use essential cookies to keep you signed in and the site working properly. We don&apos;t
          use tracking or advertising cookies.{" "}
          <Link
            href="/legal/privacy-policy"
            className="font-medium text-amber-700 underline hover:text-amber-800"
          >
            Learn more
          </Link>
        </p>
        <button
          type="button"
          onClick={acknowledge}
          className="shrink-0 rounded-md bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
