import Link from "next/link";

export default function FinalCta() {
  return (
    <section className="border-t border-[#DCE6ED] bg-[#0B1830]">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-12 sm:flex-row sm:items-center lg:px-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Verified data on the global pump dealer network.
          </h2>
          <p className="mt-2 max-w-lg text-sm text-[#AEB9C7]">
            Explore pump producer coverage, pump dealer records and network changes across markets worldwide.
          </p>
        </div>
        <Link
          href="/intelligence"
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-[#F5A900] px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#16243D] transition-colors hover:bg-[#DE9800]"
        >
          Explore Database
        </Link>
      </div>
    </section>
  );
}
