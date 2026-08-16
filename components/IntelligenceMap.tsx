"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Dealer } from "@/lib/dealers";
import { countryToPercent } from "@/lib/countryCoords";
import { PumpShapeIcon } from "@/components/shapes";

const MAX_MARKERS_PER_COUNTRY = 16;
const OFFSET_STEP_PX = 9;

function spiralOffset(index: number) {
  const angle = index * 137.5 * (Math.PI / 180);
  const radius = OFFSET_STEP_PX * Math.sqrt(index);
  return { dx: radius * Math.cos(angle), dy: radius * Math.sin(angle) };
}

type IntelligenceMapProps = {
  dealers: Dealer[];
  allPumpTypes: string[];
  selectedId: number | null;
  onMarkerClick: (id: number) => void;
  onOverflowClick: (country: string) => void;
};

export default function IntelligenceMap({
  dealers,
  allPumpTypes,
  selectedId,
  onMarkerClick,
  onOverflowClick,
}: IntelligenceMapProps) {
  const groups = useMemo(() => {
    const map = new Map<string, Dealer[]>();
    for (const row of dealers) {
      const list = map.get(row.ulke);
      if (list) list.push(row);
      else map.set(row.ulke, [row]);
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

        {groups.map(([country, rows]) => {
          const pos = countryToPercent(country);
          if (!pos) return null;

          const visible = rows.slice(0, MAX_MARKERS_PER_COUNTRY);
          const overflow = rows.length - visible.length;

          return (
            <div key={country}>
              {visible.map((row, i) => {
                const { dx, dy } = spiralOffset(i);
                const isSelected = row.id === selectedId;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => onMarkerClick(row.id)}
                    title={`${row.bayi_adi} · ${row.satici} (${row.pump}) · ${country}`}
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
                      <PumpShapeIcon pumpType={row.pump} filled={false} size={14} />
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
