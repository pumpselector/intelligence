import Image from "next/image";

type NetworkPoint = {
  id: string;
  label: string;
  top: number;
  left: number;
  type: "factory" | "warehouse";
};

const points: NetworkPoint[] = [
  { id: "us", label: "United States", top: 26.7, left: 25.7, type: "factory" },
  { id: "de", label: "Germany", top: 22.2, left: 52.4, type: "factory" },
  { id: "cn", label: "China", top: 32.6, left: 83.7, type: "factory" },
  { id: "br", label: "Brazil", top: 63.1, left: 37.1, type: "warehouse" },
  { id: "in", label: "India", top: 39.4, left: 70.2, type: "warehouse" },
  { id: "tr", label: "Turkey", top: 27.2, left: 58.1, type: "warehouse" },
  { id: "za", label: "South Africa", top: 64.6, left: 57.8, type: "warehouse" },
  { id: "au", label: "Australia", top: 68.8, left: 92.0, type: "warehouse" },
];

const connections: [string, string][] = [
  ["br", "us"],
  ["tr", "de"],
  ["za", "de"],
  ["in", "de"],
  ["in", "cn"],
  ["au", "cn"],
];

const pointById = Object.fromEntries(points.map((p) => [p.id, p]));

function FactoryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
      <path
        d="M3 21V11l5 3.2V11l5 3.2V11l6 3.5V21H3Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      <path d="M6 8V5l2 1.5V5l2 1.5V5l2 1.5V3h1v5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WarehouseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
      <path
        d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      <path d="M9 21v-6h6v6" stroke="#0f172a" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

export default function PumpNetworkMap() {
  return (
    <div className="relative w-full rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
      <div className="relative aspect-[2/1] w-full">
        <Image
          src="/world-map.png"
          alt="World map showing global pump manufacturer and dealer network"
          fill
          priority
          className="object-contain opacity-90 select-none pointer-events-none"
        />

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          {connections.map(([fromId, toId]) => {
            const from = pointById[fromId];
            const to = pointById[toId];
            if (!from || !to) return null;
            return (
              <line
                key={`${fromId}-${toId}`}
                x1={from.left}
                y1={from.top}
                x2={to.left}
                y2={to.top}
                className="pump-network-line"
                stroke="#0ea5e9"
                strokeOpacity="0.6"
                strokeWidth="0.25"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {points.map((point) => (
          <div
            key={point.id}
            title={`${point.label} · ${point.type === "factory" ? "Manufacturer" : "Dealer / Warehouse"}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ top: `${point.top}%`, left: `${point.left}%` }}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white shadow-lg ${
                point.type === "factory"
                  ? "bg-amber-400 text-slate-900"
                  : "bg-emerald-400 text-slate-900"
              }`}
            >
              {point.type === "factory" ? <FactoryIcon /> : <WarehouseIcon />}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          Manufacturer
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          Dealer / Warehouse
        </div>
      </div>
    </div>
  );
}
