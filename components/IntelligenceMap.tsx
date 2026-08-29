"use client";

import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { geoEqualEarth, geoPath } from "d3-geo";
import { dbNameToGeoName, geoNameToDbName } from "@/lib/countryNameMap";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const SPHERE = { type: "Sphere" as const };

// Equal Earth's world silhouette isn't a clean rectangle — fitting it into an
// arbitrarily large box first tells us its true width/height ratio, so the
// logical box below can match it exactly instead of leaving empty margins on
// the sides (which a guessed ratio like 2.4:1 would).
const NATURAL_ASPECT = (() => {
  const probe = geoPath(geoEqualEarth().fitSize([10000, 10000], SPHERE));
  const [[x0, y0], [x1, y1]] = probe.bounds(SPHERE);
  return (x1 - x0) / (y1 - y0);
})();

// Logical SVG viewBox size the projection is fitted to. The map scales to its
// container via CSS while this aspect ratio (and the un-cut world) is preserved.
const MAP_WIDTH = 1200;
const MAP_HEIGHT = Math.round(MAP_WIDTH / NATURAL_ASPECT);

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.5;

export const MAP_COLORS = {
  selected: "#4f46e5",
  inResults: "#a5b4fc",
  noMatch: "#e2e8f0",
};

type IntelligenceMapProps = {
  /** DB country names to lightly highlight (e.g. countries a selected producer sells into). */
  highlightedCountries: string[];
  /** DB country names currently active in the Countries filter — shown solid. */
  selectedCountries: string[];
  onCountryClick: (country: string) => void;
};

function ZoomButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center text-base font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"
    >
      {label}
    </button>
  );
}

/** Clickable, zoomable/pannable world map — small countries stay reachable once zoomed in. */
export default function IntelligenceMap({ highlightedCountries, selectedCountries, onCountryClick }: IntelligenceMapProps) {
  const highlightSet = useMemo(() => new Set(highlightedCountries.map(dbNameToGeoName)), [highlightedCountries]);
  const selectedSet = useMemo(() => new Set(selectedCountries.map(dbNameToGeoName)), [selectedCountries]);

  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([0, 0]);

  // Derive the scale that fits the whole sphere (poles included) exactly inside
  // MAP_WIDTH x MAP_HEIGHT, so the world is never clipped. react-simple-maps
  // builds its own projection instance from `projection`/`projectionConfig` and
  // centers it at [width/2, height/2] — which matches fitSize's translate here —
  // so handing it just the computed scale reproduces the fitted projection.
  const scale = useMemo(() => geoEqualEarth().fitSize([MAP_WIDTH, MAP_HEIGHT], SPHERE).scale(), []);

  function zoomBy(factor: number) {
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));
  }

  /** Recenter + reset zoom only — the active country filter is untouched. */
  function resetView() {
    setZoom(MIN_ZOOM);
    setCenter([0, 0]);
  }

  return (
    <div className="relative w-full px-3 py-2" style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}>
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale }}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        className="h-full w-full"
      >
        <ZoomableGroup
          zoom={zoom}
          center={center}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          onMoveEnd={({ zoom: nextZoom, coordinates }) => {
            setZoom(nextZoom);
            setCenter(coordinates);
          }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const geoName = geo.properties.name as string;
                const dbName = geoNameToDbName(geoName);
                const isSelected = selectedSet.has(geoName);
                const isHighlighted = highlightSet.has(geoName);
                const fill = isSelected ? MAP_COLORS.selected : isHighlighted ? MAP_COLORS.inResults : MAP_COLORS.noMatch;
                const hoverFill = isSelected ? "#4338ca" : "#cbd5e1";

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => onCountryClick(dbName)}
                    fill={fill}
                    stroke="#94a3b8"
                    strokeWidth={0.4}
                    className="cursor-pointer"
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: hoverFill },
                      pressed: { outline: "none" },
                    }}
                  >
                    <title>{dbName}</title>
                  </Geography>
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      <button
        type="button"
        onClick={resetView}
        title="Reset view"
        aria-label="Reset view"
        className="absolute right-3 top-3 flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-900"
      >
        <span className="text-sm leading-none">↺</span>
        Reset view
      </button>

      <div className="absolute bottom-3 right-3 flex flex-col divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <ZoomButton label="+" onClick={() => zoomBy(ZOOM_STEP)} />
        <ZoomButton label="−" onClick={() => zoomBy(1 / ZOOM_STEP)} />
      </div>
    </div>
  );
}
