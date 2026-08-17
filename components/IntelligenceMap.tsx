"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, Line, ZoomableGroup, useMapContext } from "react-simple-maps";
import type { GeoProjection } from "d3-geo";
import { Dealer, hasValue } from "@/lib/dealers";
import { Selection, TopSelection } from "@/lib/selection";
import { getProducerColor } from "@/lib/producerColor";
import Hexagon from "@/components/shapes/Hexagon";
import Circle from "@/components/shapes/Circle";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const JITTER_DEGREES = 0.3;
const CLUSTER_THRESHOLD = 15;

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

function hasCoords(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng);
}

function jitteredDealerPoint(row: Dealer): [number, number] {
  const { dlat, dlng } = jitterFor(`dealer-${row.id}`);
  return [row.bayi_lng! + dlng, row.bayi_lat! + dlat];
}

function centroidOf(rows: Dealer[]): [number, number] {
  const lat = rows.reduce((sum, r) => sum + r.bayi_lat!, 0) / rows.length;
  const lng = rows.reduce((sum, r) => sum + r.bayi_lng!, 0) / rows.length;
  return [lng, lat];
}

type MapView = { center: [number, number]; zoom: number };

/** Fits the given [lng,lat] points into the viewport, with a fixed close-in zoom for a single point. */
function computeFitView(points: [number, number][], projection: GeoProjection, width: number, height: number): MapView | null {
  if (points.length === 0) return null;
  if (points.length === 1) return { center: points[0], zoom: 5 };

  const projected = points.map((p) => projection(p)).filter((p): p is [number, number] => p != null);
  if (projected.length === 0) return null;

  const xs = projected.map((p) => p[0]);
  const ys = projected.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const PADDING = 50;
  const boxWidth = Math.max(maxX - minX, 1);
  const boxHeight = Math.max(maxY - minY, 1);
  const scaleX = (width - PADDING * 2) / boxWidth;
  const scaleY = (height - PADDING * 2) / boxHeight;
  const zoom = Math.min(Math.max(Math.min(scaleX, scaleY), 1), 8);

  const centerPixel: [number, number] = [(minX + maxX) / 2, (minY + maxY) / 2];
  const centerGeo = projection.invert ? projection.invert(centerPixel) : null;

  return { center: centerGeo ?? points[0], zoom };
}

/** Invisible helper rendered inside ComposableMap — recomputes the target view whenever `points` changes. */
function FitBounds({ points, onChange }: { points: [number, number][]; onChange: (view: MapView) => void }) {
  const { width, height, projection } = useMapContext();

  useEffect(() => {
    const next = computeFitView(points, projection, width, height);
    if (next) onChange(next);
  }, [points, width, height, projection, onChange]);

  return null;
}

function ClusterMarker({
  coordinates,
  count,
  memberPoints,
  onZoomTo,
}: {
  coordinates: [number, number];
  count: number;
  memberPoints: [number, number][];
  onZoomTo: (view: MapView) => void;
}) {
  const { width, height, projection } = useMapContext();

  return (
    <Marker
      coordinates={coordinates}
      className="cursor-pointer"
      onClick={() => {
        const next = computeFitView(memberPoints, projection, width, height);
        if (next) onZoomTo(next);
      }}
    >
      <title>{`${count} dealers here — click to zoom in`}</title>
      <circle r={9} fill="#1e293b" stroke="#ffffff" strokeWidth={1.5} />
      <text textAnchor="middle" dominantBaseline="central" style={{ fontSize: 9, fontWeight: 700, fill: "#ffffff" }}>
        {count}
      </text>
    </Marker>
  );
}

function DealerPinMarker({ row, isSelected, onClick }: { row: Dealer; isSelected: boolean; onClick: () => void }) {
  return (
    <Marker
      coordinates={jitteredDealerPoint(row)}
      onClick={onClick}
      className="cursor-pointer transition-transform hover:scale-150"
    >
      <title>{`${hasValue(row.bayi_adi) ? row.bayi_adi : "Dealer"} · ${hasValue(row.uretici) ? row.uretici : "?"} · ${
        row.bayi_ulke ?? ""
      }`}</title>
      <circle
        r={5}
        fill={hasValue(row.uretici) ? getProducerColor(row.uretici) : "#64748b"}
        stroke="#ffffff"
        strokeWidth={1.5}
        className={isSelected ? "drop-shadow-[0_0_0_2px_rgba(37,99,235,0.9)]" : undefined}
      />
    </Marker>
  );
}

type ProducerPoint = { name: string; country: string; lat: number; lng: number };
type ProducerVisibility = "active" | "faded" | "hidden";

/** One marker per distinct producer name with valid coordinates. */
function collectProducers(dealers: Dealer[]): ProducerPoint[] {
  const seen = new Map<string, ProducerPoint>();
  for (const row of dealers) {
    if (hasValue(row.uretici) && hasValue(row.uretici_ulke) && hasCoords(row.uretici_lat, row.uretici_lng)) {
      if (!seen.has(row.uretici)) {
        seen.set(row.uretici, {
          name: row.uretici,
          country: row.uretici_ulke,
          lat: row.uretici_lat!,
          lng: row.uretici_lng!,
        });
      }
    }
  }
  return [...seen.values()];
}

/** Progressive-disclosure rule: which dealer rows + producers are on screen for the current top-level filter. */
function computeVisible(dealers: Dealer[], top: TopSelection) {
  switch (top.kind) {
    case "none":
      return { dealerRows: [] as Dealer[], activeProducerNames: null as Set<string> | null, connectorIds: new Set<number>() };

    case "producer":
      return {
        dealerRows: dealers.filter((d) => d.uretici === top.value && hasCoords(d.bayi_lat, d.bayi_lng)),
        activeProducerNames: new Set([top.value]),
        connectorIds: new Set<number>(),
      };

    case "country": {
      const dealerRows = dealers.filter((d) => d.bayi_ulke === top.value && hasCoords(d.bayi_lat, d.bayi_lng));
      const names = new Set<string>();
      for (const r of dealerRows) if (hasValue(r.uretici)) names.add(r.uretici);
      for (const d of dealers) if (d.uretici_ulke === top.value && hasValue(d.uretici)) names.add(d.uretici);
      return { dealerRows, activeProducerNames: names, connectorIds: new Set<number>() };
    }

    case "pump": {
      const dealerRows = dealers.filter((d) => d.pump === top.value && hasCoords(d.bayi_lat, d.bayi_lng));
      const names = new Set<string>();
      for (const r of dealerRows) if (hasValue(r.uretici)) names.add(r.uretici);
      return { dealerRows, activeProducerNames: names, connectorIds: new Set<number>() };
    }

    case "dealer": {
      const dealerRows = dealers.filter((d) => d.bayi_adi === top.value && hasCoords(d.bayi_lat, d.bayi_lng));
      const names = new Set<string>();
      for (const r of dealerRows) if (hasValue(r.uretici)) names.add(r.uretici);
      return { dealerRows, activeProducerNames: names, connectorIds: new Set(dealerRows.map((r) => r.id)) };
    }
  }
}

type IntelligenceMapProps = {
  dealers: Dealer[];
  selection: Selection;
  onProducerClick: (name: string) => void;
  onDealerClick: (id: number) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
};

export default function IntelligenceMap({
  dealers,
  selection,
  onProducerClick,
  onDealerClick,
  isFullscreen = false,
  onToggleFullscreen,
}: IntelligenceMapProps) {
  const [view, setView] = useState<MapView>({ center: [0, 0], zoom: 1 });
  const handleFitChange = useCallback((next: MapView) => setView(next), []);

  const producers = useMemo(() => collectProducers(dealers), [dealers]);
  const producerByName = useMemo(() => new Map(producers.map((p) => [p.name, p])), [producers]);

  const { dealerRows, activeProducerNames, connectorIds } = useMemo(
    () => computeVisible(dealers, selection.top),
    [dealers, selection.top]
  );

  const visibleProducers = useMemo(
    () =>
      producers.map((p) => {
        let visibility: ProducerVisibility;
        if (activeProducerNames === null) visibility = "active";
        else if (selection.top.kind === "producer") visibility = activeProducerNames.has(p.name) ? "active" : "faded";
        else visibility = activeProducerNames.has(p.name) ? "active" : "hidden";
        return { ...p, visibility };
      }),
    [producers, activeProducerNames, selection.top]
  );

  const dealerGroups = useMemo(() => {
    const map = new Map<string, Dealer[]>();
    for (const row of dealerRows) {
      const list = map.get(row.bayi_ulke!);
      if (list) list.push(row);
      else map.set(row.bayi_ulke!, [row]);
    }
    return [...map.entries()];
  }, [dealerRows]);

  const recordRow = selection.recordId != null ? dealers.find((d) => d.id === selection.recordId) ?? null : null;

  const allConnectorIds = useMemo(() => {
    const ids = new Set(connectorIds);
    if (recordRow) ids.add(recordRow.id);
    return ids;
  }, [connectorIds, recordRow]);

  const connectorRows = dealerRows.filter((r) => allConnectorIds.has(r.id));
  const extraConnectorRow =
    recordRow && !connectorRows.some((r) => r.id === recordRow.id) && hasCoords(recordRow.bayi_lat, recordRow.bayi_lng)
      ? recordRow
      : null;

  const fitPoints = useMemo<[number, number][]>(() => {
    if (recordRow && hasCoords(recordRow.bayi_lat, recordRow.bayi_lng)) {
      return [jitteredDealerPoint(recordRow)];
    }
    const pts: [number, number][] = [];
    for (const p of visibleProducers) if (p.visibility === "active") pts.push([p.lng, p.lat]);
    for (const row of dealerRows) pts.push(jitteredDealerPoint(row));
    return pts;
  }, [recordRow, visibleProducers, dealerRows]);

  return (
    <div className={isFullscreen ? "flex h-full w-full flex-col" : "w-full"}>
      <div
        className={
          isFullscreen
            ? "flex w-full flex-1 flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            : "w-full rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
        }
      >
        <div
          className={
            isFullscreen
              ? "relative w-full flex-1 overflow-hidden rounded-lg bg-white"
              : "relative aspect-[2/1] w-full overflow-hidden rounded-lg bg-white"
          }
        >
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white/90 text-slate-700 shadow-sm hover:bg-white"
            >
              {isFullscreen ? "✕" : "⛶"}
            </button>
          )}
          <ComposableMap
            projection="geoEqualEarth"
            projectionConfig={{ scale: 140 }}
            width={800}
            height={400}
            className="h-full w-full"
          >
            <FitBounds points={fitPoints} onChange={handleFitChange} />

            <ZoomableGroup center={view.center} zoom={view.zoom} minZoom={1} maxZoom={12}>
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#e2e8f0"
                      stroke="#94a3b8"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none", fill: "#cbd5e1" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))
                }
              </Geographies>

              {[...connectorRows, ...(extraConnectorRow ? [extraConnectorRow] : [])].map((row) => {
                const producer = row.uretici && producerByName.get(row.uretici);
                if (!producer) return null;
                return (
                  <Line
                    key={`line-${row.id}`}
                    from={jitteredDealerPoint(row)}
                    to={[producer.lng, producer.lat]}
                    stroke="#0ea5e9"
                    strokeWidth={0.6}
                    strokeOpacity={0.7}
                    strokeDasharray="2,2"
                  />
                );
              })}

              {visibleProducers
                .filter((p) => p.visibility !== "hidden")
                .map((p) => {
                  const isSelected = selection.top.kind === "producer" && selection.top.value === p.name;
                  const isFaded = p.visibility === "faded";
                  return (
                    <Marker
                      key={`producer-${p.name}`}
                      coordinates={[p.lng, p.lat]}
                      onClick={() => onProducerClick(p.name)}
                      className={`cursor-pointer transition-opacity hover:opacity-100 ${isFaded ? "opacity-35" : "opacity-100"}`}
                    >
                      <title>{`${p.name} · manufacturer · ${p.country}`}</title>
                      <g
                        className={isSelected ? "drop-shadow-[0_0_0_2px_rgba(37,99,235,0.9)]" : undefined}
                        transform="translate(-8, -8)"
                      >
                        <Hexagon color={getProducerColor(p.name)} filled size={16} />
                      </g>
                    </Marker>
                  );
                })}

              {dealerGroups.map(([country, rows]) => {
                const singledOut = recordRow && rows.some((r) => r.id === recordRow.id) ? recordRow : null;
                const rest = singledOut ? rows.filter((r) => r.id !== singledOut.id) : rows;
                const shouldCluster = rest.length > CLUSTER_THRESHOLD;

                return (
                  <g key={country}>
                    {singledOut && <DealerPinMarker row={singledOut} isSelected onClick={() => onDealerClick(singledOut.id)} />}
                    {shouldCluster ? (
                      <ClusterMarker
                        coordinates={centroidOf(rest)}
                        count={rest.length}
                        memberPoints={rest.map(jitteredDealerPoint)}
                        onZoomTo={setView}
                      />
                    ) : (
                      rest.map((row) => (
                        <DealerPinMarker
                          key={row.id}
                          row={row}
                          isSelected={selection.recordId === row.id}
                          onClick={() => onDealerClick(row.id)}
                        />
                      ))
                    )}
                  </g>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Hexagon color="#64748B" filled size={13} />
          Manufacturer
        </div>
        <div className="flex items-center gap-2">
          <Circle color="#64748B" filled size={9} />
          Dealer
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-800 text-[8px] ring-1 ring-slate-600">
            N
          </span>
          cluster — click to zoom in
        </div>
        <span className="text-slate-400">Color = manufacturer</span>
      </div>
    </div>
  );
}
