export type TopSelection =
  | { kind: "none" }
  | { kind: "pump"; value: string }
  | { kind: "producer"; value: string }
  | { kind: "country"; value: string }
  | { kind: "dealer"; value: string };

/**
 * `top` drives which markers/list are shown (progressive disclosure level 1).
 * `recordId` optionally drills into one specific dealer row within that
 * top-level context (level 2) — e.g. a producer's dealer list, then one card.
 */
export type Selection = {
  top: TopSelection;
  recordId: number | null;
};

export const EMPTY_SELECTION: Selection = { top: { kind: "none" }, recordId: null };
