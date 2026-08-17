"use client";

import { useMemo } from "react";
import { Dealer, hasValue } from "@/lib/dealers";
import { Selection } from "@/lib/selection";
import { PumpShapeIcon } from "@/components/shapes";

type IntelligenceDetailPanelProps = {
  selection: Selection;
  dealers: Dealer[];
};

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">
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

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-slate-200 py-2 text-sm text-slate-800 last:border-0">
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

export default function IntelligenceDetailPanel({ selection, dealers }: IntelligenceDetailPanelProps) {
  const content = useMemo(() => {
    switch (selection.kind) {
      case "pump": {
        const rows = dealers.filter((d) => d.pump === selection.value);
        const producers = [...new Set(rows.map((r) => r.uretici).filter(hasValue))].sort();
        const dealerList = [...new Set(rows.map((r) => r.bayi_adi).filter(hasValue))].sort();
        return (
          <Panel title={`Pump — ${selection.value}`}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">
                  Manufacturers ({producers.length})
                </p>
                {producers.map((p) => (
                  <Row key={p}>
                    <PumpShapeIcon pumpType={selection.value} filled size={13} />
                    {p}
                  </Row>
                ))}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">Dealers ({dealerList.length})</p>
                <div className="max-h-64 overflow-auto pr-1">
                  {dealerList.map((d) => (
                    <Row key={d}>
                      <PumpShapeIcon pumpType={selection.value} filled={false} size={13} />
                      {d}
                    </Row>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        );
      }

      case "producer": {
        const rows = dealers.filter((d) => d.uretici === selection.value);
        const pumps = [...new Set(rows.map((r) => r.pump).filter(hasValue))].sort();
        const countries = [...new Set(rows.map((r) => r.bayi_ulke).filter(hasValue))].sort();
        const headquarters = rows.find((r) => hasValue(r.uretici_ulke) || hasValue(r.uretici_adres));
        return (
          <Panel title={`Manufacturer — ${selection.value}`}>
            {headquarters && (hasValue(headquarters.uretici_ulke) || hasValue(headquarters.uretici_adres)) && (
              <p className="mb-4 text-sm text-slate-600">
                Headquartered in {hasValue(headquarters.uretici_ulke) ? headquarters.uretici_ulke : "—"}
                {hasValue(headquarters.uretici_adres) ? ` · ${headquarters.uretici_adres}` : ""}
              </p>
            )}
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-slate-500">Pumps produced</p>
              <div className="flex flex-wrap gap-2">
                {pumps.map((p) => (
                  <span
                    key={p}
                    className="flex items-center gap-1.5 rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-800"
                  >
                    <PumpShapeIcon pumpType={p} filled size={12} />
                    {p}
                  </span>
                ))}
              </div>
            </div>
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
                      <Row key={r.id}>
                        {hasValue(r.pump) && <PumpShapeIcon pumpType={r.pump} filled={false} size={13} />}
                        <span className="truncate">{hasValue(r.bayi_adi) ? r.bayi_adi : "—"}</span>
                        <span className="ml-auto shrink-0 text-xs text-slate-500">
                          {hasValue(r.bayi_ulke) ? r.bayi_ulke : "—"}
                        </span>
                      </Row>
                    ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">Countries ({countries.length})</p>
                <div className="max-h-64 overflow-auto pr-1">
                  {countries.map((c) => (
                    <Row key={c}>{c}</Row>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        );
      }

      case "country": {
        const rows = dealers.filter((d) => d.bayi_ulke === selection.value);
        return (
          <Panel title={`Country — ${selection.value}`}>
            <p className="mb-2 text-xs font-medium text-slate-500">Dealers ({rows.length})</p>
            <div className="max-h-72 overflow-auto pr-1">
              {rows
                .slice()
                .sort((a, b) => (a.bayi_adi ?? "").localeCompare(b.bayi_adi ?? ""))
                .map((r) => (
                  <Row key={r.id}>
                    {hasValue(r.pump) && <PumpShapeIcon pumpType={r.pump} filled={false} size={13} />}
                    <span className="truncate">{hasValue(r.bayi_adi) ? r.bayi_adi : "—"}</span>
                    <span className="ml-auto shrink-0 text-xs text-slate-500">
                      {hasValue(r.uretici) ? r.uretici : "—"} · {hasValue(r.pump) ? r.pump : "—"}
                    </span>
                  </Row>
                ))}
            </div>
          </Panel>
        );
      }

      case "dealer": {
        const rows = dealers.filter((d) => d.bayi_adi === selection.value);
        return (
          <Panel title={`Dealer — ${selection.value}`}>
            <p className="mb-2 text-xs font-medium text-slate-500">Sells ({rows.length})</p>
            <div className="max-h-72 overflow-auto pr-1">
              {rows.map((r) => (
                <Row key={r.id}>
                  {hasValue(r.pump) && <PumpShapeIcon pumpType={r.pump} filled={false} size={13} />}
                  <span className="truncate">
                    {hasValue(r.pump) ? r.pump : "—"} — {hasValue(r.uretici) ? r.uretici : "—"}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-slate-500">
                    {hasValue(r.bayi_ulke) ? r.bayi_ulke : "—"}
                  </span>
                </Row>
              ))}
            </div>
          </Panel>
        );
      }

      case "record": {
        const row = dealers.find((d) => d.id === selection.id);
        if (!row) return <Empty>Record not found.</Empty>;
        return (
          <Panel title={`Dealer record — #${row.id}`}>
            <div className="mb-4 flex items-center gap-3">
              {hasValue(row.pump) && <PumpShapeIcon pumpType={row.pump} filled={false} size={22} />}
              <div>
                <p className="text-base font-semibold text-slate-900">
                  {hasValue(row.bayi_adi) ? row.bayi_adi : "—"}
                </p>
                <p className="text-xs text-slate-500">
                  {hasValue(row.pump) ? row.pump : "—"} · {hasValue(row.uretici) ? row.uretici : "—"} ·{" "}
                  {hasValue(row.bayi_ulke) ? row.bayi_ulke : "—"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Field label="Dealer address" value={row.bayi_adres} />
              <Field label="Dealer phone" value={row.bayi_telefon} />
              <Field label="Dealer email" value={row.bayi_email} />
              <Field label="Dealer website" value={row.bayi_web} />
              <Field label="Manufacturer country" value={row.uretici_ulke} />
              <Field label="Manufacturer address" value={row.uretici_adres} />
            </div>
          </Panel>
        );
      }

      case "none":
      default:
        return <Empty>Filtrelemek için yukarıdan bir seçim yapın.</Empty>;
    }
  }, [selection, dealers]);

  return <div>{content}</div>;
}
