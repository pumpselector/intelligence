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
    <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-700 text-sm text-slate-500">
      {children}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-slate-800/70 py-2 text-sm text-slate-200 last:border-0">
      {children}
    </div>
  );
}

export default function IntelligenceDetailPanel({ selection, dealers }: IntelligenceDetailPanelProps) {
  const content = useMemo(() => {
    switch (selection.kind) {
      case "pump": {
        const rows = dealers.filter((d) => d.pump === selection.value);
        const producers = [...new Set(rows.map((r) => r.satici))].sort();
        const dealerList = [...new Set(rows.map((r) => r.bayi_adi))].sort();
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
        const rows = dealers.filter((d) => d.satici === selection.value);
        const pumps = [...new Set(rows.map((r) => r.pump))].sort();
        const countries = [...new Set(rows.map((r) => r.ulke))].sort();
        return (
          <Panel title={`Manufacturer — ${selection.value}`}>
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-slate-500">Pumps produced</p>
              <div className="flex flex-wrap gap-2">
                {pumps.map((p) => (
                  <span
                    key={p}
                    className="flex items-center gap-1.5 rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-200"
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
                    .sort((a, b) => a.bayi_adi.localeCompare(b.bayi_adi))
                    .map((r) => (
                      <Row key={r.id}>
                        <PumpShapeIcon pumpType={r.pump} filled={false} size={13} />
                        <span className="truncate">{r.bayi_adi}</span>
                        <span className="ml-auto shrink-0 text-xs text-slate-500">{r.ulke}</span>
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
        const rows = dealers.filter((d) => d.ulke === selection.value);
        return (
          <Panel title={`Country — ${selection.value}`}>
            <p className="mb-2 text-xs font-medium text-slate-500">Dealers ({rows.length})</p>
            <div className="max-h-72 overflow-auto pr-1">
              {rows
                .slice()
                .sort((a, b) => a.bayi_adi.localeCompare(b.bayi_adi))
                .map((r) => (
                  <Row key={r.id}>
                    <PumpShapeIcon pumpType={r.pump} filled={false} size={13} />
                    <span className="truncate">{r.bayi_adi}</span>
                    <span className="ml-auto shrink-0 text-xs text-slate-500">
                      {r.satici} · {r.pump}
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
                  <PumpShapeIcon pumpType={r.pump} filled={false} size={13} />
                  <span className="truncate">
                    {r.pump} — {r.satici}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-slate-500">{r.ulke}</span>
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
              <PumpShapeIcon pumpType={row.pump} filled={false} size={22} />
              <div>
                <p className="text-base font-semibold text-slate-100">{row.bayi_adi}</p>
                <p className="text-xs text-slate-500">
                  {row.pump} · {row.satici} · {row.ulke}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-xs text-slate-500">Address</span>
                <p className="text-slate-200">{hasValue(row.adres) ? row.adres : "—"}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Phone</span>
                <p className="text-slate-200">{hasValue(row.telefon) ? row.telefon : "—"}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Email</span>
                <p className="text-slate-200">{hasValue(row.email) ? row.email : "—"}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Website</span>
                <p className="text-slate-200">{hasValue(row.web) ? row.web : "—"}</p>
              </div>
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
