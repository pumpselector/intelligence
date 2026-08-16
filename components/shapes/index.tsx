import { getPumpTypeDef } from "@/lib/pumpTypes";
import { ShapeProps } from "./types";
import Square from "./Square";
import Circle from "./Circle";
import Triangle from "./Triangle";
import Diamond from "./Diamond";
import Hexagon from "./Hexagon";

export const SHAPES = {
  square: Square,
  circle: Circle,
  triangle: Triangle,
  diamond: Diamond,
  hexagon: Hexagon,
} as const;

export type { ShapeProps };

type PumpShapeIconProps = {
  pumpType: string;
  filled?: boolean;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

/** Renders the shape/color assigned to a pump type — filled for producers, hollow for dealers. */
export function PumpShapeIcon({ pumpType, filled = true, size, strokeWidth, className }: PumpShapeIconProps) {
  const def = getPumpTypeDef(pumpType);
  const Shape = SHAPES[def.shape];
  return (
    <Shape color={def.color} filled={filled} size={size} strokeWidth={strokeWidth} className={className} />
  );
}
