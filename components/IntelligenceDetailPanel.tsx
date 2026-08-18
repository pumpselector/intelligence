"use client";

import { useEffect, useMemo, useState } from "react";
import { Dealer, hasValue } from "@/lib/dealers";
import { getProducerColor } from "@/lib/producerColor";

const PAGE_SIZE = 20;

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

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <p className="mt-0.5 text-sm text-slate-800">{hasValue(value) ? value : "—"}</p>
    </div>
  );
}

function ProducerDot({ producer }: { producer: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
      style={{ backgroundColor: getProducerColor(producer) }}
    />
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.1" />
      <path d="M8 7.25v3.75" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="8" cy="5.1" r="0.15" fill="currentColor" stroke="currentColor" strokeWidth="0.9" />
    </svg>
  );
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
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            {hasValue(row.uretici) && <ProducerDot producer={row.uretici} />}
            <div>
              <p className="text-base font-semibold text-slate-900">
                {hasValue(row.bayi_adi) ? row.bayi_adi : "—"}
              </p>
              <p className="text-xs text-slate-500">
                {hasValue(row.uretici) ? row.uretici : "—"} · {hasValue(row.bayi_ulke) ? row.bayi_ulke : "—"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3.5 text-sm">
          <Field label="Pump type" value={row.pump} />
          <Field label="Dealer address" value={row.bayi_adres} />
          <Field label="Dealer phone" value={row.bayi_telefon} />
          <Field label="Dealer email" value={row.bayi_email} />
          <Field label="Dealer website" value={row.bayi_web} />
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

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dealers;
    return dealers.filter((d) =>
      [d.uretici, d.bayi_ulke, d.pump, d.bayi_adi].some((v) => hasValue(v) && v.toLowerCase().includes(q))
    );
  }, [dealers, search]);

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
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                <SortHeader label="Country" column="bayi_ulke" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="Manufacturer" column="uretici" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="Pump Type" column="pump" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="Dealer" column="bayi_adi" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                    No matching records found.
                  </td>
                </tr>
              )}
              {pageRows.map((row) => (
                <tr key={row.id} className="group border-t border-slate-100 hover:bg-slate-50/80">
                  <td className="px-4 py-2 text-slate-600">{hasValue(row.bayi_ulke) ? row.bayi_ulke : "—"}</td>
                  <td className="px-4 py-2">
                    <span className="flex items-center gap-2">
                      {hasValue(row.uretici) && <ProducerDot producer={row.uretici} />}
                      <span className="truncate font-medium text-slate-800">
                        {hasValue(row.uretici) ? row.uretici : "—"}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{hasValue(row.pump) ? row.pump : "—"}</td>
                  <td className="px-4 py-2">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-medium text-slate-800">
                        {hasValue(row.bayi_adi) ? row.bayi_adi : "—"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDetailRowId(row.id)}
                        title="Show details"
                        className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-slate-300 opacity-0 transition-opacity hover:text-indigo-600 group-hover:opacity-100"
                      >
                        <InfoIcon />
                      </button>
                    </span>
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
