import { ShapeProps } from "./types";

export default function Triangle({ color, filled = true, size = 14, strokeWidth = 2, className }: ShapeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 3 21 20 3 20Z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={filled ? 0 : strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
}
