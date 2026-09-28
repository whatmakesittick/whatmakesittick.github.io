import { DRILL_FLOOR_ABOVE_SEA_M, SEABED_DEPTH_M } from './wellPlan';

export const SEA_LEVEL_Y = 0;
export const DRILL_FLOOR_Y = DRILL_FLOOR_ABOVE_SEA_M;
export const WATER_COMPRESSION = 5;
export const ROCK_COMPRESSION = 12;
export const TUBULAR_SCALE = 8;

interface ScaleSegment {
  fromDepth: number;
  fromY: number;
  unitsPerMetre: number;
}

const SEGMENTS: readonly ScaleSegment[] = [
  { fromDepth: 0, fromY: DRILL_FLOOR_Y, unitsPerMetre: 1 },
  { fromDepth: DRILL_FLOOR_ABOVE_SEA_M, fromY: SEA_LEVEL_Y, unitsPerMetre: 1 / WATER_COMPRESSION },
  {
    fromDepth: SEABED_DEPTH_M,
    fromY: SEA_LEVEL_Y - (SEABED_DEPTH_M - DRILL_FLOOR_ABOVE_SEA_M) / WATER_COMPRESSION,
    unitsPerMetre: 1 / ROCK_COMPRESSION,
  },
];

export const SEABED_Y = SEGMENTS[2].fromY;

function segmentForDepth(depth: number): ScaleSegment {
  let segment = SEGMENTS[0];
  for (const candidate of SEGMENTS) if (depth >= candidate.fromDepth) segment = candidate;
  return segment;
}

function segmentForY(y: number): ScaleSegment {
  let segment = SEGMENTS[0];
  for (const candidate of SEGMENTS) if (y <= candidate.fromY) segment = candidate;
  return segment;
}

export function depthToY(depth: number): number {
  const segment = segmentForDepth(depth);
  return segment.fromY - (depth - segment.fromDepth) * segment.unitsPerMetre;
}

export function yToDepth(y: number): number {
  const segment = segmentForY(y);
  return segment.fromDepth + (segment.fromY - y) / segment.unitsPerMetre;
}

export function unitsPerMetreAt(depth: number): number {
  return segmentForDepth(depth).unitsPerMetre;
}

export function tubularRadius(diameterInches: number): number {
  return (diameterInches * 0.0254 * TUBULAR_SCALE) / 2;
}
