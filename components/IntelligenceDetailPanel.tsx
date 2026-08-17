"use client";

import { useMemo } from "react";
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

function DealerCard({ row, onClick }: { row: Dealer; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 border-b border-slate-200 py-2.5 text-left text-sm text-slate-800 last:border-0 hover:bg-slate-100"
    >
      {hasValue(row.uretici) && <ProducerDot producer={row.uretici} />}
      <span className="min-w-0 flex-1 truncate">{hasValue(row.bayi_adi) ? row.bayi_adi : "—"}</span>
      {hasValue(row.pump) && (
        <span className="shrink-0 rounded-full border border-slate-300 px-2 py-0.5 text-[10px] text-slate-600">
          {row.pump}
        </span>
      )}
      <span className="shrink-0 text-xs text-slate-500">{hasValue(row.bayi_ulke) ? row.bayi_ulke : "—"}</span>
    </button>
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

export default function IntelligenceDetailPanel({
  selection,
  dealers,
  onSelectRecord,
  onSelectProducer,
  onBack,
  onReset,
}: IntelligenceDetailPanelProps) {
  const { top, recordId } = selection;

  const recordRow = useMemo(
    () => (recordId != null ? dealers.find((d) => d.id === recordId) ?? null : null),
    [dealers, recordId]
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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">Manufacturers ({producers.length})</p>
                {producers.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onSelectProducer(p)}
                    className="flex w-full items-center gap-2.5 border-b border-slate-200 py-2 text-left text-sm text-slate-800 last:border-0 hover:bg-slate-100"
                  >
                    <ProducerDot producer={p} />
                    {p}
                  </button>
                ))}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">Dealers ({rows.length})</p>
                <div className="max-h-64 overflow-auto pr-1">
                  {rows.map((r) => (
                    <DealerCard key={r.id} row={r} onClick={() => onSelectRecord(r.id)} />
                  ))}
                </div>
              </div>
            </div>
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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">
                  Dealers ({rows.length}) across {countries.length} countries
                </p>
                <div className="max-h-64 overflow-auto pr-1">
                  {rows
                    .slice()
                    .sort((a, b) => (a.bayi_adi ?? "").localeCompare(b.bayi_adi ?? ""))
                    .map((r) => (
                      <DealerCard key={r.id} row={r} onClick={() => onSelectRecord(r.id)} />
                    ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">Countries ({countries.length})</p>
                <div className="max-h-64 overflow-auto pr-1 text-sm text-slate-700">
                  {countries.map((c) => (
                    <div key={c} className="border-b border-slate-200 py-2 last:border-0">
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        );
      }

      case "country": {
        const rows = dealers.filter((d) => d.bayi_ulke === top.value);
        return (
          <Panel title={`Country — ${top.value}`}>
            <p className="mb-2 text-xs font-medium text-slate-500">Dealers ({rows.length})</p>
            <div className="max-h-96 overflow-auto pr-1">
              {rows
                .slice()
                .sort((a, b) => (a.bayi_adi ?? "").localeCompare(b.bayi_adi ?? ""))
                .map((r) => (
                  <DealerCard key={r.id} row={r} onClick={() => onSelectRecord(r.id)} />
                ))}
            </div>
          </Panel>
        );
      }

      case "dealer": {
        const rows = dealers.filter((d) => d.bayi_adi === top.value);
        return (
          <Panel title={`Dealer — ${top.value}`}>
            <p className="mb-2 text-xs font-medium text-slate-500">Sells ({rows.length})</p>
            <div className="max-h-96 overflow-auto pr-1">
              {rows.map((r) => (
                <DealerCard key={r.id} row={r} onClick={() => onSelectRecord(r.id)} />
              ))}
            </div>
          </Panel>
        );
      }

      case "none":
      default:
        return <Empty>Bir üretici veya ülke seçerek başlayın.</Empty>;
    }
  }, [top, recordRow, dealers, onSelectRecord, onSelectProducer]);

  return (
    <div>
      {showBreadcrumb && <Breadcrumb items={breadcrumbItems} onNavigate={onBack} />}
      {body}
    </div>
  );
}
