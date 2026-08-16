export type ShapeName = "square" | "circle" | "triangle" | "diamond" | "hexagon";

export type PumpTypeDef = {
  shape: ShapeName;
  color: string;
  label: string;
};

/**
 * Known pump types from the dealers table. Add new entries here as new
 * `pump` values show up in the data — anything not listed falls back to
 * a deterministic shape/color via getPumpTypeDef() below.
 */
export const PUMP_TYPES: Record<string, PumpTypeDef> = {
  AODD: { shape: "square", color: "#DC2626", label: "AODD" },
};

const FALLBACK_PALETTE: { shape: ShapeName; color: string }[] = [
  { shape: "circle", color: "#2563EB" },
  { shape: "triangle", color: "#16A34A" },
  { shape: "diamond", color: "#9333EA" },
  { shape: "hexagon", color: "#EA580C" },
  { shape: "square", color: "#0D9488" },
  { shape: "circle", color: "#CA8A04" },
  { shape: "triangle", color: "#DB2777" },
  { shape: "diamond", color: "#4F46E5" },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Returns the shape/color/label for a pump type, generating a stable fallback for unknown types. */
export function getPumpTypeDef(pumpType: string): PumpTypeDef {
  const known = PUMP_TYPES[pumpType];
  if (known) return known;

  const fallback = FALLBACK_PALETTE[hashString(pumpType) % FALLBACK_PALETTE.length];
  return { ...fallback, label: pumpType };
}
