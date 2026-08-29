/**
 * Route-level skeleton for /news. Next.js renders this instantly (via Suspense)
 * while the server component loads the news list. Mirrors NewsClient: heading +
 * filter row, then a stack of network-change cards.
 */
function CardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="h-5 w-28 rounded-full bg-slate-200" />
          <div className="h-3 w-20 rounded bg-slate-100" />
        </div>
        <div className="h-5 w-16 rounded-full bg-slate-100" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        <div>
          <div className="h-2.5 w-24 rounded bg-slate-100" />
          <div className="mt-2 h-4 w-40 rounded bg-slate-200" />
        </div>
        <div>
          <div className="h-2.5 w-20 rounded bg-slate-100" />
          <div className="mt-2 h-4 w-44 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export default function NewsLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl animate-pulse px-6 py-8 lg:px-10">
        {/* Heading + filter row */}
        <div className="mb-6">
          <div className="h-3 w-24 rounded bg-slate-200" />
          <div className="mt-2.5 h-7 w-64 rounded bg-slate-200" />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="h-9 w-48 rounded-md bg-slate-100" />
            <div className="h-9 w-48 rounded-md bg-slate-100" />
            <div className="h-9 w-48 rounded-md bg-slate-100" />
          </div>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
