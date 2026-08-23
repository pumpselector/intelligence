type Stat = { label: string; value: number };

/** Compact, bordered data-snapshot grid — real counts only, no illustrative cards. */
export default function NetworkCoverage({ stats }: { stats: Stat[] }) {
  return (
    <section className="border-b border-[#DCE6ED] bg-white">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#53657A]">
          Network Coverage
        </span>

        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#DCE6ED] bg-[#DCE6ED] sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white px-5 py-5">
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-[#16243D]">
                {stat.value.toLocaleString()}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[#53657A]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
