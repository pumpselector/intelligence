import Link from "next/link";
import PumpNetworkMap from "./PumpNetworkMap";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(56,189,248,0.12),_transparent_55%)]" />

      <div className="relative mx-auto grid min-h-[85vh] w-full max-w-7xl grid-cols-1 items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:px-8">
        <div className="flex flex-col items-start text-left">
          <span className="mb-6 rounded-full border border-slate-700 bg-slate-900/60 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-slate-400">
            Pump Industry Intelligence
          </span>

          <h1 className="text-6xl font-bold leading-[1.05] tracking-tight text-white sm:text-7xl">
            Solve the Global Pump Network
          </h1>

          <p className="mt-6 max-w-xl text-lg text-slate-400 sm:text-xl">
            Access pump manufacturers, their dealers, and country coverage —
            do not miss any connection in the pump industry.
          </p>

          <Link
            href="/intelligence"
            className="mt-10 inline-flex items-center justify-center rounded-md bg-amber-400 px-8 py-4 text-sm font-bold uppercase tracking-wide text-slate-900 shadow-lg shadow-amber-500/20 transition-colors hover:bg-amber-300"
          >
            Access Database
          </Link>
        </div>

        <div className="relative">
          <PumpNetworkMap />
        </div>
      </div>
    </section>
  );
}
