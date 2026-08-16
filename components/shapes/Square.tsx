import { ShapeProps } from "./types";

export default function Square({ color, filled = true, size = 14, strokeWidth = 2, className }: ShapeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="1.5"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={filled ? 0 : strokeWidth}
      />
    </svg>
  );
}
