import type { Point2 } from '../inset/strokes';

const EDGE_TOLERANCE = 1e-9;

export function centresAlong(start: number, end: number, pitch: number): number[] {
  const count = Math.floor((end - start) / pitch + EDGE_TOLERANCE);
  const margin = (end - start - count * pitch) / 2;
  return Array.from({ length: count }, (_, index) => start + margin + pitch * (index + 0.5));
}

export function wallOutline(
  face: number,
  thickness: number,
  bottom: number,
  height: number,
  chamfer: number,
): Point2[] {
  const top = bottom + height;
  return [
    [face, bottom],
    [face + thickness, bottom],
    [face + thickness, top],
    [face + chamfer, top],
    [face, top - chamfer],
  ];
}

export function mirrorOutline(points: readonly Point2[]): Point2[] {
  return points.map(([a, y]): Point2 => [-a, y]).reverse();
}

export function trapezoid(
  bottomHalf: number,
  topHalf: number,
  bottom: number,
  top: number,
): Point2[] {
  return [
    [-bottomHalf, bottom],
    [bottomHalf, bottom],
    [topHalf, top],
    [-topHalf, top],
  ];
}
