import { ShapeProps } from "./types";

export default function Diamond({ color, filled = true, size = 14, strokeWidth = 2, className }: ShapeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 2 22 12 12 22 2 12Z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={filled ? 0 : strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
}
