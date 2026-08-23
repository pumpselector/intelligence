const PILLARS = [
  {
    title: "Manufacturer Network",
    body: "Track pump manufacturers and their global distribution footprint.",
  },
  {
    title: "Distributor Intelligence",
    body: "Explore distributors, locations and contact information.",
  },
  {
    title: "Network Changes",
    body: "Monitor additions, removals and changes across the network.",
  },
];

/** Structured editorial columns — deliberately not marketing cards. */
export default function ProductPillars() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-10">
          {PILLARS.map((pillar, i) => (
            <div key={pillar.title} className="border-t border-[#DCE6ED] pt-4">
              <span className="text-xs font-medium tabular-nums text-[#53657A]">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 text-base font-semibold text-[#16243D]">{pillar.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#53657A]">{pillar.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
