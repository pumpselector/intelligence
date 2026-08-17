"use client";

import { useEffect, useMemo, useState } from "react";
import { Dealer, hasValue } from "@/lib/dealers";
import { getProducerColor } from "@/lib/producerColor";

const PAGE_SIZE = 20;

type SortColumn = "uretici" | "bayi_ulke" | "pump" | "bayi_adi";
type SortDirection = "asc" | "desc";

type IntelligenceDetailPanelProps = {
  /** Rows already narrowed by the four filter boxes. */
  dealers: Dealer[];
  /** Full, unfiltered dataset size — for the "X kayıttan Y tanesi" line. */
  totalCount: number;
};

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <span className="text-xs text-slate-500">{label}</span>
      <p className="text-slate-800">{hasValue(value) ? value : "—"}</p>
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
        <div className="mb-4 flex items-start justify-between gap-3">
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
        <div className="grid grid-cols-1 gap-3 text-sm">
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
    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
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

export default function IntelligenceDetailPanel({ dealers, totalCount }: IntelligenceDetailPanelProps) {
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("uretici");
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
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          {totalCount} kayıttan {sorted.length} tanesi gösteriliyor.
        </p>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ara: üretici, bayi, ülke, pompa tipi..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 sm:w-72"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr>
              <SortHeader label="Üretici" column="uretici" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortHeader label="Ülke" column="bayi_ulke" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortHeader label="Pompa Tipi" column="pump" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortHeader label="Bayi" column="bayi_adi" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-400">
                  Eşleşen kayıt bulunamadı.
                </td>
              </tr>
            )}
            {pageRows.map((row, i) => (
              <tr key={row.id} className={i % 2 === 1 ? "bg-slate-50/60" : undefined}>
                <td className="border-t border-slate-200 px-3 py-2.5">
                  <span className="flex items-center gap-2">
                    {hasValue(row.uretici) && <ProducerDot producer={row.uretici} />}
                    <span className="truncate text-slate-800">{hasValue(row.uretici) ? row.uretici : "—"}</span>
                  </span>
                </td>
                <td className="border-t border-slate-200 px-3 py-2.5 text-slate-700">
                  {hasValue(row.bayi_ulke) ? row.bayi_ulke : "—"}
                </td>
                <td className="border-t border-slate-200 px-3 py-2.5 text-slate-700">
                  {hasValue(row.pump) ? row.pump : "—"}
                </td>
                <td className="border-t border-slate-200 px-3 py-2.5">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-slate-800">{hasValue(row.bayi_adi) ? row.bayi_adi : "—"}</span>
                    <button
                      type="button"
                      onClick={() => setDetailRowId(row.id)}
                      title="Detayları göster"
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold italic text-slate-600 hover:bg-slate-100"
                    >
                      i
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ◀ Önceki
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
                  p === currentPage ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
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
            Sonraki ▶
          </button>
        </div>
      )}

      {detailRow && <DealerDetailModal row={detailRow} onClose={() => setDetailRowId(null)} />}
    </div>
  );
}
