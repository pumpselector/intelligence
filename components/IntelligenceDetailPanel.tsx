"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Globe, Mail, MapPin, Phone, X, type LucideIcon } from "lucide-react";
import { Dealer, hasValue, isRecentlyAdded } from "@/lib/dealers";
import { searchDealers } from "@/lib/filters";
import { getProducerColor } from "@/lib/producerColor";

const PAGE_SIZE = 20;

/** "gün.ay.yıl" — e.g. 05.03.2026 — used for the Inactive badge's "since" line. */
function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getFullYear()}`;
}

function StatusCell({ row }: { row: Dealer }) {
  if (row.status === "inactive") {
    return (
      <div>
        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
          Inactive
        </span>
        {hasValue(row.last_seen) && (
          <p className="mt-1 text-[10px] text-slate-400">since {formatDate(row.last_seen)}</p>
        )}
      </div>
    );
  }

  if (row.status === "active") {
    if (isRecentlyAdded(row.first_seen)) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
          New
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  }

  return <span className="text-slate-300">—</span>;
}

type SortColumn = "bayi_ulke" | "uretici" | "pump" | "bayi_adi";
type SortDirection = "asc" | "desc";

type IntelligenceDetailPanelProps = {
  /** Rows already narrowed by the four filter boxes. */
  dealers: Dealer[];
  /** Full, unfiltered dataset size — for the "Showing Y of X dealers" line. */
  totalCount: number;
  /** Free-text search, owned by the parent so it can live in the top filter bar. */
  search: string;
};

function ProducerDot({ producer }: { producer: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
      style={{ backgroundColor: getProducerColor(producer) }}
    />
  );
}

function DealerInfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null;
  href?: string;
}) {
  const content = hasValue(value) ? value : "—";
  const isMailto = href?.startsWith("mailto:");

  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.75} />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        {href && hasValue(value) ? (
          <a
            href={href}
            target={isMailto ? undefined : "_blank"}
            rel={isMailto ? undefined : "noopener noreferrer"}
            className="block truncate text-base text-slate-700 transition-colors hover:text-indigo-600 hover:underline"
          >
            {content}
          </a>
        ) : (
          <p className="truncate text-base text-slate-700">{content}</p>
        )}
      </div>
    </div>
  );
}

function withProtocol(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function DealerDetailModal({ row, onClose }: { row: Dealer; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>

        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-5 px-8 py-8">
          {/* Left: Producer only */}
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Producer</span>
            <div className="mt-1.5 flex items-center gap-2">
              {hasValue(row.uretici) && <ProducerDot producer={row.uretici} />}
              <p className="truncate text-xl font-bold leading-tight text-slate-900">
                {hasValue(row.uretici) ? row.uretici : "—"}
              </p>
            </div>
            <p className="mt-2 text-base leading-snug text-slate-500">
              {hasValue(row.uretici_adres) ? row.uretici_adres : "—"}
            </p>
            <p className="text-base leading-snug text-slate-500">
              {hasValue(row.uretici_ulke) ? row.uretici_ulke : "—"}
            </p>
          </div>

          {/* Center: pump badge + arrow */}
          <div className="flex flex-col items-center pt-6">
            <span className="mb-2 whitespace-nowrap rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 shadow-sm">
              {hasValue(row.pump) ? row.pump : "Pump"}
            </span>
            <ArrowRight className="h-8 w-8 text-slate-600" strokeWidth={2.25} />
          </div>

          {/* Right: Dealer name + all dealer info stacked below */}
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Dealer</span>
            <p className="mt-1.5 truncate text-xl font-bold leading-tight text-slate-900">
              {hasValue(row.bayi_adi) ? row.bayi_adi : "—"}
            </p>

            <div className="mt-4 space-y-3.5">
              <DealerInfoRow icon={MapPin} label="Address" value={row.bayi_adres} />
              <DealerInfoRow icon={Phone} label="Phone" value={row.bayi_telefon} />
              <DealerInfoRow
                icon={Mail}
                label="Email"
                value={row.bayi_email}
                href={hasValue(row.bayi_email) ? `mailto:${row.bayi_email}` : undefined}
              />
              <DealerInfoRow
                icon={Globe}
                label="Website"
                value={row.bayi_web}
                href={hasValue(row.bayi_web) ? withProtocol(row.bayi_web) : undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** first, ellipsis, current±1, ellipsis, last — keeps the page list short even at 59 pages. */
function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  const delta = 1;
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);
  const pages: (number | "ellipsis")[] = [1];

  if (left > 2) pages.push("ellipsis");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push("ellipsis");
  if (total > 1) pages.push(total);

  return pages;
}

function SortHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
}: {
  label: string;
  column: SortColumn;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
}) {
  const active = sortColumn === column;
  return (
    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`flex items-center gap-1 hover:text-slate-800 ${active ? "text-slate-900" : ""}`}
      >
        {label}
        <span className="text-[10px]">{active ? (sortDirection === "asc" ? "▲" : "▼") : "⇅"}</span>
      </button>
    </th>
  );
}

export default function IntelligenceDetailPanel({ dealers, totalCount, search }: IntelligenceDetailPanelProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("bayi_ulke");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [detailRowId, setDetailRowId] = useState<number | null>(null);

  const searched = useMemo(() => searchDealers(dealers, search), [dealers, search]);

  const sorted = useMemo(() => {
    const collator = new Intl.Collator("en", { sensitivity: "base" });
    return [...searched].sort((a, b) => {
      const cmp = collator.compare(a[sortColumn] ?? "", b[sortColumn] ?? "");
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [searched, sortColumn, sortDirection]);

  // The underlying row set changed (filters or search) — jump back to page 1.
  useEffect(() => {
    setPage(1);
  }, [dealers, search]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const detailRow = useMemo(
    () => (detailRowId != null ? dealers.find((d) => d.id === detailRowId) ?? null : null),
    [dealers, detailRowId]
  );

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {search.trim() ? (
            <>
              <span className="font-medium text-slate-900">{sorted.length.toLocaleString()}</span> of{" "}
              {totalCount.toLocaleString()} listings
            </>
          ) : (
            <>
              <span className="font-medium text-slate-900">{sorted.length.toLocaleString()}</span> listings
            </>
          )}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="max-h-[680px] overflow-auto">
          <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[25%]" />
              <col className="w-[16%]" />
              <col className="w-[22%]" />
              <col className="w-[13%]" />
              <col className="w-[88px]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                <SortHeader label="Country" column="bayi_ulke" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="Manufacturer" column="uretici" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="Pump Type" column="pump" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="Dealer" column="bayi_adi" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-4 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                    No matching records found.
                  </td>
                </tr>
              )}
              {pageRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                  <td className="truncate px-4 py-2 text-slate-600">{hasValue(row.bayi_ulke) ? row.bayi_ulke : "—"}</td>
                  <td className="px-4 py-2">
                    <span className="flex min-w-0 items-center gap-2">
                      {hasValue(row.uretici) && <ProducerDot producer={row.uretici} />}
                      <span className="min-w-0 truncate font-medium text-slate-800">
                        {hasValue(row.uretici) ? row.uretici : "—"}
                      </span>
                    </span>
                  </td>
                  <td className="truncate px-4 py-2 text-slate-600">{hasValue(row.pump) ? row.pump : "—"}</td>
                  <td className="truncate px-4 py-2 font-medium text-slate-800">
                    {hasValue(row.bayi_adi) ? row.bayi_adi : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <StatusCell row={row} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setDetailRowId(row.id)}
                      title="Show details"
                      className="shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium leading-none text-slate-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ◀ Previous
          </button>

          {getPageNumbers(currentPage, pageCount).map((p, i) =>
            p === "ellipsis" ? (
              <span key={`e-${i}`} className="px-1 text-xs text-slate-400">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`h-7 w-7 rounded-md text-xs font-medium ${
                  p === currentPage ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={currentPage === pageCount}
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next ▶
          </button>
        </div>
      )}

      {detailRow && <DealerDetailModal row={detailRow} onClose={() => setDetailRowId(null)} />}
    </div>
  );
}
