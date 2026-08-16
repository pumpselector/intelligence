import { ShapeProps } from "./types";

export default function Hexagon({ color, filled = true, size = 14, strokeWidth = 2, className }: ShapeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 2 20.66 7 20.66 17 12 22 3.34 17 3.34 7Z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={filled ? 0 : strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
}
