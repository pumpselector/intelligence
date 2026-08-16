"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Dealer, hasValue } from "@/lib/dealers";
import { countryToPercent } from "@/lib/countryCoords";
import { PumpShapeIcon } from "@/components/shapes";
import Square from "@/components/shapes/Square";

const MAX_MARKERS_PER_COUNTRY = 16;
const OFFSET_STEP_PX = 9;

function spiralOffset(index: number) {
  const angle = index * 137.5 * (Math.PI / 180);
  const radius = OFFSET_STEP_PX * Math.sqrt(index);
  return { dx: radius * Math.cos(angle), dy: radius * Math.sin(angle) };
}

type Marker =
  | { kind: "dealer"; key: string; id: number; pump: string; country: string; title: string }
  | { kind: "producer"; key: string; name: string; pump: string; country: string; title: string };

type IntelligenceMapProps = {
  dealers: Dealer[];
  allPumpTypes: string[];
  selectedId: number | null;
  selectedProducer: string | null;
  onDealerClick: (id: number) => void;
  onProducerClick: (name: string) => void;
  onOverflowClick: (country: string) => void;
};

export default function IntelligenceMap({
  dealers,
  allPumpTypes,
  selectedId,
  selectedProducer,
  onDealerClick,
  onProducerClick,
  onOverflowClick,
}: IntelligenceMapProps) {
  const groups = useMemo(() => {
    const map = new Map<string, Marker[]>();

    const addMarker = (country: string, marker: Marker) => {
      const list = map.get(country);
      if (list) list.push(marker);
      else map.set(country, [marker]);
    };

    const seenProducers = new Set<string>();
    for (const row of dealers) {
      if (hasValue(row.uretici) && hasValue(row.uretici_ulke) && hasValue(row.pump)) {
        const producerKey = `${row.uretici}|${row.uretici_ulke}|${row.pump}`;
        if (!seenProducers.has(producerKey)) {
          seenProducers.add(producerKey);
          addMarker(row.uretici_ulke, {
            kind: "producer",
            key: producerKey,
            name: row.uretici,
            pump: row.pump,
            country: row.uretici_ulke,
            title: `${row.uretici} · manufacturer (${row.pump}) · ${row.uretici_ulke}`,
          });
        }
      }
    }

    for (const row of dealers) {
      if (hasValue(row.bayi_ulke) && hasValue(row.pump)) {
        addMarker(row.bayi_ulke, {
          kind: "dealer",
          key: `dealer-${row.id}`,
          id: row.id,
          pump: row.pump,
          country: row.bayi_ulke,
          title: `${hasValue(row.bayi_adi) ? row.bayi_adi : "Dealer"} · ${
            hasValue(row.uretici) ? row.uretici : "?"
          } (${row.pump}) · ${row.bayi_ulke}`,
        });
      }
    }

    return [...map.entries()];
  }, [dealers]);

  return (
    <div className="w-full">
      <div className="relative aspect-[2/1] w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60">
        <Image
          src="/world-map.png"
          alt="World map"
          fill
          className="pointer-events-none select-none object-contain opacity-70"
        />

        {groups.map(([country, markers]) => {
          const pos = countryToPercent(country);
          if (!pos) return null;

          const visible = markers.slice(0, MAX_MARKERS_PER_COUNTRY);
          const overflow = markers.length - visible.length;

          return (
            <div key={country}>
              {visible.map((marker, i) => {
                const { dx, dy } = spiralOffset(i);
                const isSelected =
                  marker.kind === "dealer"
                    ? marker.id === selectedId
                    : marker.name === selectedProducer;

                return (
                  <button
                    key={marker.key}
                    type="button"
                    onClick={() =>
                      marker.kind === "dealer" ? onDealerClick(marker.id) : onProducerClick(marker.name)
                    }
                    title={marker.title}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:z-10 hover:scale-150"
                    style={{ top: `calc(${pos.top}% + ${dy}px)`, left: `calc(${pos.left}% + ${dx}px)` }}
                  >
                    <span
                      className={
                        isSelected
                          ? "block rounded-full drop-shadow-[0_0_0_2px_rgba(56,189,248,0.9)]"
                          : "block"
                      }
                    >
                      <PumpShapeIcon pumpType={marker.pump} filled={marker.kind === "producer"} size={14} />
                    </span>
                  </button>
                );
              })}

              {overflow > 0 && (
                <button
                  type="button"
                  onClick={() => onOverflowClick(country)}
                  title={`+${overflow} more in ${country}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-[9px] font-semibold leading-none text-slate-100 ring-1 ring-slate-900 hover:bg-slate-600"
                  style={{
                    top: `calc(${pos.top}% + ${spiralOffset(visible.length).dy}px)`,
                    left: `calc(${pos.left}% + ${spiralOffset(visible.length).dx}px)`,
                  }}
                >
                  +{overflow}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Square color="#94A3B8" filled size={12} />
          Manufacturer
        </div>
        <div className="flex items-center gap-2">
          <Square color="#94A3B8" filled={false} size={12} />
          Dealer
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-800 text-[8px] ring-1 ring-slate-600">
            +N
          </span>
          more in that country
        </div>
        {allPumpTypes.map((pumpType) => (
          <div key={pumpType} className="flex items-center gap-2">
            <PumpShapeIcon pumpType={pumpType} filled={false} size={13} />
            {pumpType}
          </div>
        ))}
      </div>
    </div>
  );
}
