export const METRES_PER_UNIT = 1;
export const CENTIMETRES_PER_METRE = 100;
export const MILLIMETRES_PER_METRE = 1000;

export function metresToUnits(metres: number): number {
  return metres / METRES_PER_UNIT;
}

export function metresToCentimetres(metres: number): number {
  return metres * CENTIMETRES_PER_METRE;
}
