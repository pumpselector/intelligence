import Link from "next/link";

const LINKS = [
  { href: "/contact", label: "Contact us" },
  { href: "/legal/impressum", label: "Impressum" },
  { href: "/legal/privacy-policy", label: "Privacy Policy" },
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/cookie-policy", label: "Cookie Policy" },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-slate-500 sm:flex-row lg:px-10">
        <p>© {new Date().getFullYear()} PumpRadar24 — a service of XLT Limited. All rights reserved.</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
