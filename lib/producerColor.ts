function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Multiplying by the golden angle spreads hues evenly around the wheel even
// when input hashes cluster, so colors stay visually distinct as more
// producers are added — no fixed-size palette to run out of.
const GOLDEN_ANGLE = 137.508;
const SATURATION = 68;
const LIGHTNESS = 42;

/** Deterministic color for a producer name — the same name always yields the same color. */
export function getProducerColor(producerName: string): string {
  const hue = (hashString(producerName) * GOLDEN_ANGLE) % 360;
  return `hsl(${hue.toFixed(1)}, ${SATURATION}%, ${LIGHTNESS}%)`;
}
