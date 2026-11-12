import type { OpticsId, Point } from '../ids';

export type Box = Readonly<{ centre: Point; size: Point }>;
export type Span = Readonly<{
  x: readonly [number, number];
  y: readonly [number, number];
  z: readonly [number, number];
}>;

const MM_PER_METRE = 1000;
const METRES_PER_UM = 1e-6;
const METRES_PER_NM = 1e-9;
const HALF = 0.5;

export const DROPLET_MAGNIFICATION = 10_000;
export const PATTERN_MAGNIFICATION = 5_000_000;
export const PATTERN_LINES = 14;
export const VIRUS_NM = 100;

export const LINE_NM: Readonly<Record<OpticsId, number>> = { na033: 13, na055: 8 };

export function metres(value: number): number {
  return value;
}

export function mm(value: number): number {
  return value / MM_PER_METRE;
}

export function dropletDrawnM(um: number): number {
  return um * METRES_PER_UM * DROPLET_MAGNIFICATION;
}

export function patternDrawnM(nm: number): number {
  return nm * METRES_PER_NM * PATTERN_MAGNIFICATION;
}

export function lineWidthM(optics: OpticsId): number {
  return patternDrawnM(LINE_NM[optics]);
}

export function patchWidthM(optics: OpticsId): number {
  return patternDrawnM(LINE_NM[optics] * PATTERN_LINES * 2);
}

export function boxSpan({ centre, size }: Box): Span {
  const extent = (axis: 0 | 1 | 2): readonly [number, number] => [
    centre[axis] - size[axis] * HALF,
    centre[axis] + size[axis] * HALF,
  ];
  return { x: extent(0), y: extent(1), z: extent(2) };
}
