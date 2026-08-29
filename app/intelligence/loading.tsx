/**
 * Route-level skeleton for /intelligence. Next.js renders this instantly (via
 * Suspense) while the server component fetches the dealer dataset, so the user
 * sees the page's shape instead of a blank screen. Rough shape only — filter
 * sidebar + coverage map, then the listings table below.
 */
export default function IntelligenceLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1440px] animate-pulse px-6 py-8 lg:px-10">
        {/* Heading */}
        <div className="mb-6 max-w-2xl">
          <div className="h-3 w-44 rounded bg-slate-200" />
          <div className="mt-3 h-7 w-80 rounded bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[350px_1fr]">
          {/* Filter sidebar */}
          <aside className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 rounded bg-slate-200" />
              <div className="h-6 w-24 rounded bg-slate-100" />
            </div>

            {/* Search box */}
            <div className="h-9 w-full rounded-md bg-slate-100" />

            {/* Filter dropdowns */}
            <div className="flex flex-col gap-2">
              <div className="h-9 w-full rounded-md bg-slate-100" />
              <div className="h-9 w-full rounded-md bg-slate-100" />
              <div className="h-9 w-full rounded-md bg-slate-100" />
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-2 gap-y-4 border-t border-slate-100 pt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="h-6 w-16 rounded bg-slate-200" />
                  <div className="mt-2 h-2.5 w-20 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </aside>

          {/* Coverage map */}
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div className="h-3 w-40 rounded bg-slate-200" />
              <div className="h-3 w-28 rounded bg-slate-100" />
            </div>
            <div className="aspect-[1200/795] w-full bg-slate-100" />
            <div className="flex items-center justify-center gap-5 border-t border-slate-100 px-5 py-3">
              <div className="h-2.5 w-16 rounded bg-slate-100" />
              <div className="h-2.5 w-16 rounded bg-slate-100" />
              <div className="h-2.5 w-20 rounded bg-slate-100" />
            </div>
          </div>
        </div>

        {/* Listings table */}
        <div className="mt-6">
          <div className="mb-2.5 h-4 w-32 rounded bg-slate-200" />
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
              {["15%", "27%", "17%", "31%"].map((w, i) => (
                <div key={i} className="h-3 rounded bg-slate-200" style={{ width: w }} />
              ))}
            </div>
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0"
              >
                <div className="h-3.5 rounded bg-slate-200" style={{ width: "15%" }} />
                <div className="h-3.5 rounded bg-slate-100" style={{ width: "27%" }} />
                <div className="h-3.5 rounded bg-slate-100" style={{ width: "17%" }} />
                <div className="h-3.5 rounded bg-slate-100" style={{ width: "31%" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
