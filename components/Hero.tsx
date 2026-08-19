import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(56,189,248,0.10),_transparent_55%)]" />

      <div className="relative mx-auto grid min-h-[85vh] w-full max-w-7xl grid-cols-1 items-start gap-16 px-6 py-20 lg:grid-cols-2 lg:px-8">
        <div className="flex flex-col items-start text-left">
          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
            The Pump Dealer Network, Tracked.
          </h1>

          <p className="mt-6 max-w-xl text-lg text-slate-600 sm:text-xl">
            Monitor distributor appointments, changes, and market movements across the
            pump industry. Get notified as soon as important changes happen.
          </p>

          <Link
            href="/intelligence"
            className="mt-10 inline-flex items-center justify-center rounded-md bg-amber-400 px-8 py-4 text-sm font-bold uppercase tracking-wide text-slate-900 shadow-lg shadow-amber-500/20 transition-colors hover:bg-amber-300"
          >
            Access Database
          </Link>
        </div>

        <div className="relative">
          <Image
            src="/pump_dealer_network.png"
            alt="Global pump dealer network"
            width={1693}
            height={929}
            priority
            className="h-auto w-full rounded-2xl"
          />
        </div>
      </div>
    </section>
  );
}
