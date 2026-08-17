"use client";

import { useEffect, useMemo, useState } from "react";
import { Dealer, hasValue } from "@/lib/dealers";
import { Selection } from "@/lib/selection";
import { getProducerColor } from "@/lib/producerColor";

type IntelligenceDetailPanelProps = {
  selection: Selection;
  dealers: Dealer[];
  onSelectRecord: (id: number) => void;
  onSelectProducer: (name: string) => void;
  onBack: () => void;
  onReset: () => void;
};

function ProducerDot({ producer }: { producer: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
      style={{ backgroundColor: getProducerColor(producer) }}
    />
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-300 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <span className="text-xs text-slate-500">{label}</span>
      <p className="text-slate-800">{hasValue(value) ? value : "—"}</p>
    </div>
  );
}

function Breadcrumb({
  items,
  onNavigate,
}: {
  items: { label: string; onClick?: () => void }[];
  onNavigate: () => void;
}) {
  return (
    <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-500">
      {items.length > 1 && (
        <button
          type="button"
          onClick={onNavigate}
          className="mr-2 flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-100"
        >
          ◀ Geri
        </button>
      )}
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-slate-300">›</span>}
          {item.onClick ? (
            <button type="button" onClick={item.onClick} className="hover:text-slate-800 hover:underline">
              {item.label}
            </button>
          ) : (
            <span className="font-medium text-slate-800">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

/** Quick-peek popover with full dealer contact details — does not change navigation/breadcrumb state. */
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

/**
 * Row: manufacturer (+ country underneath) on the left, dealer name + "i"
 * detail button on the right. Clicking the row drills into the full record
 * breadcrumb view; clicking the manufacturer name pivots the top-level
 * filter instead; the "i" button opens a lightweight detail popover without
 * changing navigation.
 */
function DealerRow({
  row,
  otherProducers,
  onSelectProducer,
  onSelectRecord,
  onOpenDetail,
}: {
  row: Dealer;
  otherProducers: string[];
  onSelectProducer: (name: string) => void;
  onSelectRecord: (id: number) => void;
  onOpenDetail: () => void;
}) {
  const [showOthers, setShowOthers] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectRecord(row.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelectRecord(row.id);
      }}
      className="flex w-full cursor-pointer items-center gap-3 border-b border-slate-200 py-2.5 last:border-0 hover:bg-slate-100"
    >
      <div className="min-w-0 flex-1">
        {hasValue(row.uretici) ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectProducer(row.uretici!);
            }}
            className="flex min-w-0 items-center gap-2 text-left hover:underline"
          >
            <ProducerDot producer={row.uretici} />
            <span className="truncate text-sm font-medium text-slate-800">{row.uretici}</span>
          </button>
        ) : (
          <span className="text-sm text-slate-500">—</span>
        )}
        <p className="mt-0.5 pl-4 text-xs text-slate-500">{hasValue(row.bayi_ulke) ? row.bayi_ulke : "—"}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <span className="max-w-[9rem] truncate text-right text-sm text-slate-800">
          {hasValue(row.bayi_adi) ? row.bayi_adi : "—"}
        </span>

        {otherProducers.length > 0 && (
          <div className="relative" onMouseLeave={() => setShowOthers(false)}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowOthers((v) => !v);
              }}
              onMouseEnter={() => setShowOthers(true)}
              className="whitespace-nowrap rounded-full border border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100"
            >
              +{otherProducers.length} diğer üretici
            </button>
            {showOthers && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full z-20 mt-1 w-52 rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-lg"
              >
                {otherProducers.join(", ")}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail();
          }}
          title="Detayları göster"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold italic text-slate-600 hover:bg-slate-100"
        >
          i
        </button>
      </div>
    </div>
  );
}

export default function IntelligenceDetailPanel({
  selection,
  dealers,
  onSelectRecord,
  onSelectProducer,
  onBack,
  onReset,
}: IntelligenceDetailPanelProps) {
  const { top, recordId } = selection;
  const [detailRowId, setDetailRowId] = useState<number | null>(null);

  const recordRow = useMemo(
    () => (recordId != null ? dealers.find((d) => d.id === recordId) ?? null : null),
    [dealers, recordId]
  );

  const detailRow = useMemo(
    () => (detailRowId != null ? dealers.find((d) => d.id === detailRowId) ?? null : null),
    [dealers, detailRowId]
  );

  /** Which other manufacturers each dealer name also sells for, across the full (unfiltered) dataset. */
  const producersByDealerName = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const d of dealers) {
      if (!hasValue(d.bayi_adi) || !hasValue(d.uretici)) continue;
      let set = map.get(d.bayi_adi);
      if (!set) {
        set = new Set();
        map.set(d.bayi_adi, set);
      }
      set.add(d.uretici);
    }
    return map;
  }, [dealers]);

  const otherProducersFor = (row: Dealer): string[] => {
    if (!hasValue(row.bayi_adi) || !hasValue(row.uretici)) return [];
    const all = producersByDealerName.get(row.bayi_adi);
    if (!all) return [];
    return [...all].filter((p) => p !== row.uretici);
  };

  const renderDealerRows = (rows: Dealer[]) => (
    <>
      {rows.map((r) => (
        <DealerRow
          key={r.id}
          row={r}
          otherProducers={otherProducersFor(r)}
          onSelectProducer={onSelectProducer}
          onSelectRecord={onSelectRecord}
          onOpenDetail={() => setDetailRowId(r.id)}
        />
      ))}
    </>
  );

  const topLabel = top.kind === "none" ? null : top.value;

  const breadcrumbItems = useMemo(() => {
    const items: { label: string; onClick?: () => void }[] = [{ label: "All", onClick: onReset }];
    if (topLabel) {
      items.push({ label: topLabel, onClick: recordRow ? onBack : undefined });
    }
    if (recordRow) {
      items.push({ label: hasValue(recordRow.bayi_adi) ? recordRow.bayi_adi : `#${recordRow.id}` });
    }
    return items;
  }, [topLabel, recordRow, onBack, onReset]);

  const showBreadcrumb = top.kind !== "none" || recordRow != null;

  const body = useMemo(() => {
    if (recordRow) {
      return (
        <Panel title={`Dealer record — #${recordRow.id}`}>
          <div className="mb-4 flex items-center gap-3">
            {hasValue(recordRow.uretici) && <ProducerDot producer={recordRow.uretici} />}
            <div>
              <p className="text-base font-semibold text-slate-900">
                {hasValue(recordRow.bayi_adi) ? recordRow.bayi_adi : "—"}
              </p>
              <p className="text-xs text-slate-500">
                {hasValue(recordRow.uretici) ? recordRow.uretici : "—"} ·{" "}
                {hasValue(recordRow.bayi_ulke) ? recordRow.bayi_ulke : "—"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Field label="Pump type" value={recordRow.pump} />
            <Field label="Dealer address" value={recordRow.bayi_adres} />
            <Field label="Dealer phone" value={recordRow.bayi_telefon} />
            <Field label="Dealer email" value={recordRow.bayi_email} />
            <Field label="Dealer website" value={recordRow.bayi_web} />
            <Field label="Manufacturer country" value={recordRow.uretici_ulke} />
            <Field label="Manufacturer address" value={recordRow.uretici_adres} />
          </div>
        </Panel>
      );
    }

    switch (top.kind) {
      case "pump": {
        const rows = dealers.filter((d) => d.pump === top.value);
        const producers = [...new Set(rows.map((r) => r.uretici).filter(hasValue))].sort();
        return (
          <Panel title={`Pump — ${top.value}`}>
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-slate-500">Manufacturers ({producers.length})</p>
              <div className="flex flex-wrap gap-2">
                {producers.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onSelectProducer(p)}
                    className="flex items-center gap-1.5 rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-800 hover:bg-slate-100"
                  >
                    <ProducerDot producer={p} />
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <p className="mb-1 text-xs font-medium text-slate-500">Dealers ({rows.length})</p>
            <div className="max-h-96 overflow-auto pr-1">{renderDealerRows(rows)}</div>
          </Panel>
        );
      }

      case "producer": {
        const rows = dealers.filter((d) => d.uretici === top.value);
        const pumps = [...new Set(rows.map((r) => r.pump).filter(hasValue))].sort();
        const countries = [...new Set(rows.map((r) => r.bayi_ulke).filter(hasValue))].sort();
        const headquarters = rows.find((r) => hasValue(r.uretici_ulke) || hasValue(r.uretici_adres));
        return (
          <Panel title={`Manufacturer — ${top.value}`}>
            {headquarters && (hasValue(headquarters.uretici_ulke) || hasValue(headquarters.uretici_adres)) && (
              <p className="mb-4 text-sm text-slate-600">
                Headquartered in {hasValue(headquarters.uretici_ulke) ? headquarters.uretici_ulke : "—"}
                {hasValue(headquarters.uretici_adres) ? ` · ${headquarters.uretici_adres}` : ""}
              </p>
            )}
            {pumps.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-slate-500">Pumps produced</p>
                <div className="flex flex-wrap gap-2">
                  {pumps.map((p) => (
                    <span
                      key={p}
                      className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-800"
                    >
                      Pump type: {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="mb-1 text-xs font-medium text-slate-500">
              Dealers ({rows.length}) across {countries.length} countries
            </p>
            <div className="max-h-96 overflow-auto pr-1">
              {renderDealerRows(rows.slice().sort((a, b) => (a.bayi_adi ?? "").localeCompare(b.bayi_adi ?? "")))}
            </div>
          </Panel>
        );
      }

      case "country": {
        const rows = dealers.filter((d) => d.bayi_ulke === top.value);
        return (
          <Panel title={`Country — ${top.value}`}>
            <p className="mb-1 text-xs font-medium text-slate-500">Dealers ({rows.length})</p>
            <div className="max-h-96 overflow-auto pr-1">
              {renderDealerRows(rows.slice().sort((a, b) => (a.bayi_adi ?? "").localeCompare(b.bayi_adi ?? "")))}
            </div>
          </Panel>
        );
      }

      case "dealer": {
        const rows = dealers.filter((d) => d.bayi_adi === top.value);
        return (
          <Panel title={`Dealer — ${top.value}`}>
            <p className="mb-1 text-xs font-medium text-slate-500">Sells ({rows.length})</p>
            <div className="max-h-96 overflow-auto pr-1">{renderDealerRows(rows)}</div>
          </Panel>
        );
      }

      case "none":
      default:
        return <Empty>Bir üretici veya ülke seçerek başlayın.</Empty>;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top, recordRow, dealers, onSelectRecord, onSelectProducer, producersByDealerName]);

  return (
    <div>
      {showBreadcrumb && <Breadcrumb items={breadcrumbItems} onNavigate={onBack} />}
      {body}
      {detailRow && <DealerDetailModal row={detailRow} onClose={() => setDetailRowId(null)} />}
    </div>
  );
}
