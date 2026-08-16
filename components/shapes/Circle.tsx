import { ShapeProps } from "./types";

export default function Circle({ color, filled = true, size = 14, strokeWidth = 2, className }: ShapeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="9"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={filled ? 0 : strokeWidth}
      />
    </svg>
  );
}
