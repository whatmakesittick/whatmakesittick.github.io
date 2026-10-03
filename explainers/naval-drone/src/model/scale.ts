export const METRES_PER_UNIT = 1;
export const KMH_PER_KNOT = 1.852;
export const KMH_PER_MS = 3.6;
export const MS_PER_KNOT = KMH_PER_KNOT / KMH_PER_MS;
export const GRAVITY = 9.81;
export const SEAWATER_DENSITY = 1025;
export const FEET_PER_METRE = 3.28084;

export function metresToUnits(metres: number): number {
  return metres / METRES_PER_UNIT;
}

export function knotsToMs(knots: number): number {
  return knots * MS_PER_KNOT;
}

export function msToKnots(ms: number): number {
  return ms / MS_PER_KNOT;
}

export function knotsToKmh(knots: number): number {
  return knots * KMH_PER_KNOT;
}

export function msToKmh(ms: number): number {
  return ms * KMH_PER_MS;
}
