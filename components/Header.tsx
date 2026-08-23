"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/intelligence", label: "Data Explorer" },
  { href: "/news", label: "What's New" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6 lg:px-10">
        <Link href="/" className="flex items-center">
          <Logo markClassName="h-7 w-7 sm:h-8 sm:w-8" wordmarkClassName="text-[14px] sm:text-[16px]" />
        </Link>

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
      </div>
    </header>
  );
}
