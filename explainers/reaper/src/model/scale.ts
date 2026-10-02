export const METRES_PER_UNIT = 20;
export const AIRCRAFT_UNITS_PER_METRE = 1;
export const FEET_PER_METRE = 3.28084;

export function metresToUnits(metres: number): number {
  return metres / METRES_PER_UNIT;
}

export function unitsToMetres(units: number): number {
  return units * METRES_PER_UNIT;
}

export function metresToFeet(metres: number): number {
  return metres * FEET_PER_METRE;
}

export function aircraftUnits(metres: number): number {
  return metres * AIRCRAFT_UNITS_PER_METRE;
}
