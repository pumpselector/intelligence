"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import Logo from "@/components/Logo";
import HeaderAuth from "@/components/HeaderAuth";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/intelligence", label: "Database" },
  { href: "/news", label: "News" },
  { href: "/pricing", label: "Pricing & Payment" },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6 lg:px-10">
        <Link href="/" className="flex items-center">
          <Logo markClassName="h-7 w-7 sm:h-8 sm:w-8" wordmarkClassName="text-[14px] sm:text-[16px]" />
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <nav className="hidden items-center gap-6 sm:flex">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm transition-colors ${
                    active ? "font-medium text-slate-900" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <HeaderAuth />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="-mr-1 flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 sm:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-slate-200 bg-white sm:hidden">
          <div className="mx-auto flex max-w-[1440px] flex-col px-6 py-2">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-md px-2 py-2.5 text-sm transition-colors ${
                    active
                      ? "font-medium text-slate-900"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
