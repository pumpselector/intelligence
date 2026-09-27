import Link from "next/link";
import { BASE_PRICE, formatEur } from "@/lib/pricing";

export default function PricingPreview() {
  return (
    <section id="pricing" className="scroll-mt-20 bg-[#F0F9FD]">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-[#16243D] sm:text-3xl">Pricing</h2>
          <p className="mt-3 text-sm text-[#53657A] sm:text-base">
            Full access to pump producer and pump dealer data across every market we track.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-md">
          <div className="flex flex-col rounded-xl border border-[#DCE6ED] bg-white p-6 text-center">
            <h3 className="text-lg font-semibold text-[#16243D]">Monthly Subscription</h3>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#16243D]">
              {formatEur(BASE_PRICE)}
              <span className="text-sm font-normal text-[#53657A]"> / month</span>
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[#53657A]">
              No commitment, cancel anytime.
            </p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-md bg-[#16243D] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0B1830]"
          >
            View full pricing details →
          </Link>
        </div>
      </div>
    </section>
  );
}
