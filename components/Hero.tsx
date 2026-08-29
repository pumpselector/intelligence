import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="bg-[#F0F9FD]">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:px-8 lg:py-20">
        <div className="flex flex-col items-start text-left">
          <h1 className="text-balance text-[2.5rem] font-semibold leading-[1.12] tracking-tight text-[#16243D] sm:text-5xl">
            Tracking the Global Pump Industry, in <span className="whitespace-nowrap">Real Time.</span>
          </h1>

          <p className="mt-5 max-w-md text-base leading-relaxed text-[#53657A] sm:text-lg">
            PumpRadar24 monitors pump producers, pump dealers and real-time dealership changes across markets worldwide.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/intelligence"
              className="inline-flex items-center justify-center rounded-md bg-[#F5A900] px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#16243D] transition-colors hover:bg-[#DE9800]"
            >
              Explore Database
            </Link>
            <Link
              href="/#pricing"
              className="inline-flex items-center justify-center rounded-md border border-[#DCE6ED] bg-white px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#16243D] transition-colors hover:border-[#16243D]/25 hover:bg-[#F3F9FC]"
            >
              See Pricing
            </Link>
          </div>
        </div>

        <div className="relative">
          <Image
            src="/pump_dealer_network.png"
            alt="Global pump dealer network"
            width={1693}
            height={929}
            priority
            className="h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}
