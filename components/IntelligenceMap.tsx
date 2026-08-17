"use client";

import { useMemo } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { Dealer, hasValue } from "@/lib/dealers";
import { PumpShapeIcon } from "@/components/shapes";
import Square from "@/components/shapes/Square";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const MAX_MARKERS_PER_COUNTRY = 16;
const JITTER_DEGREES = 0.3;

/** Deterministic pseudo-random offset per marker so repeated renders don't jump around. */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function jitterFor(key: string): { dlat: number; dlng: number } {
  const latHash = hashString(`${key}|lat`) % 1000;
  const lngHash = hashString(`${key}|lng`) % 1000;
  return {
    dlat: ((latHash / 1000) * 2 - 1) * JITTER_DEGREES,
    dlng: ((lngHash / 1000) * 2 - 1) * JITTER_DEGREES,
  };
}

function hasCoords(
  lat: number | null | undefined,
  lng: number | null | undefined
): boolean {
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng);
}

type Marker =
  | {
      kind: "dealer";
      key: string;
      id: number;
      pump: string;
      country: string;
      title: string;
      lat: number;
      lng: number;
    }
  | {
      kind: "producer";
      key: string;
      name: string;
      pump: string;
      country: string;
      title: string;
      lat: number;
      lng: number;
    };

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
      if (
        hasValue(row.uretici) &&
        hasValue(row.uretici_ulke) &&
        hasValue(row.pump) &&
        hasCoords(row.uretici_lat, row.uretici_lng)
      ) {
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
            lat: row.uretici_lat!,
            lng: row.uretici_lng!,
          });
        }
      }
    }

    for (const row of dealers) {
      if (hasValue(row.bayi_ulke) && hasValue(row.pump) && hasCoords(row.bayi_lat, row.bayi_lng)) {
        addMarker(row.bayi_ulke, {
          kind: "dealer",
          key: `dealer-${row.id}`,
          id: row.id,
          pump: row.pump,
          country: row.bayi_ulke,
          title: `${hasValue(row.bayi_adi) ? row.bayi_adi : "Dealer"} · ${
            hasValue(row.uretici) ? row.uretici : "?"
          } (${row.pump}) · ${row.bayi_ulke}`,
          lat: row.bayi_lat!,
          lng: row.bayi_lng!,
        });
      }
    }

    return [...map.entries()];
  }, [dealers]);

  return (
    <div className="w-full">
      <div className="w-full rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
        <div className="relative aspect-[2/1] w-full overflow-hidden rounded-lg bg-white">
          <ComposableMap
            projection="geoEqualEarth"
            projectionConfig={{ scale: 140 }}
            width={800}
            height={400}
            className="h-full w-full"
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#f3f4f6"
                    stroke="#d1d5db"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "#e5e7eb" },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>

            {groups.map(([country, markers]) => {
              const visible = markers.slice(0, MAX_MARKERS_PER_COUNTRY);
              const overflow = markers.length - visible.length;

              return (
                <g key={country}>
                  {visible.map((marker) => {
                    const { dlat, dlng } = jitterFor(marker.key);
                    const coordinates: [number, number] = [marker.lng + dlng, marker.lat + dlat];
                    const isSelected =
                      marker.kind === "dealer" ? marker.id === selectedId : marker.name === selectedProducer;

                    return (
                      <Marker
                        key={marker.key}
                        coordinates={coordinates}
                        onClick={() =>
                          marker.kind === "dealer" ? onDealerClick(marker.id) : onProducerClick(marker.name)
                        }
                        className="cursor-pointer transition-transform hover:scale-150"
                      >
                        <title>{marker.title}</title>
                        <g
                          className={
                            isSelected ? "drop-shadow-[0_0_0_2px_rgba(37,99,235,0.9)]" : undefined
                          }
                          transform="translate(-7, -7)"
                        >
                          <PumpShapeIcon pumpType={marker.pump} filled={marker.kind === "producer"} size={14} />
                        </g>
                      </Marker>
                    );
                  })}

                  {overflow > 0 &&
                    (() => {
                      const meanLat = markers.reduce((sum, m) => sum + m.lat, 0) / markers.length;
                      const meanLng = markers.reduce((sum, m) => sum + m.lng, 0) / markers.length;

                      return (
                        <Marker
                          coordinates={[meanLng, meanLat]}
                          onClick={() => onOverflowClick(country)}
                          className="cursor-pointer"
                        >
                          <title>{`+${overflow} more in ${country}`}</title>
                          <circle r={8} fill="#334155" stroke="#0f172a" strokeWidth={1} />
                          <text
                            textAnchor="middle"
                            dominantBaseline="central"
                            style={{ fontSize: 8, fontWeight: 600, fill: "#f1f5f9" }}
                          >
                            +{overflow}
                          </text>
                        </Marker>
                      );
                    })()}
                </g>
              );
            })}
          </ComposableMap>
        </div>
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
