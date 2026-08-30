import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-slate-500 sm:flex-row lg:px-10">
        <p>© {new Date().getFullYear()} PumpRadar24. All rights reserved.</p>
        <Link
          href="/contact"
          className="font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          Contact us
        </Link>
      </div>
    </footer>
  );
}
