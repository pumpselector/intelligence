"use client";

import { useMemo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { dbNameToGeoName, geoNameToDbName } from "@/lib/countryNameMap";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type IntelligenceMapProps = {
  /** DB country names to lightly highlight (e.g. countries a selected producer sells into). */
  highlightedCountries: string[];
  /** DB country names currently active in the Countries filter — shown solid. */
  selectedCountries: string[];
  onCountryClick: (country: string) => void;
};

/** Small, static helper map — just clickable country shapes, no markers/zoom/pan. */
export default function IntelligenceMap({ highlightedCountries, selectedCountries, onCountryClick }: IntelligenceMapProps) {
  const highlightSet = useMemo(() => new Set(highlightedCountries.map(dbNameToGeoName)), [highlightedCountries]);
  const selectedSet = useMemo(() => new Set(selectedCountries.map(dbNameToGeoName)), [selectedCountries]);

  return (
    <div className="w-full rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 100 }}
        width={300}
        height={230}
        className="h-auto w-full"
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const geoName = geo.properties.name as string;
              const dbName = geoNameToDbName(geoName);
              const isSelected = selectedSet.has(geoName);
              const isHighlighted = highlightSet.has(geoName);
              const fill = isSelected ? "#4f46e5" : isHighlighted ? "#a5b4fc" : "#e2e8f0";
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
      </ComposableMap>
      <p className="mt-2 text-center text-[10px] text-slate-400">Click a country to filter</p>
    </div>
  );
}
