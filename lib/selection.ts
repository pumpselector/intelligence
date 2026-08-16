export type Selection =
  | { kind: "none" }
  | { kind: "pump"; value: string }
  | { kind: "producer"; value: string }
  | { kind: "country"; value: string }
  | { kind: "dealer"; value: string }
  | { kind: "record"; id: number };
