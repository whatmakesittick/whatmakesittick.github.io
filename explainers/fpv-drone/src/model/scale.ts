export const DRONE_SCALE = 10;
export const METRES_PER_SECOND_TO_KMH = 3.6;
export const GRAVITY = 9.81;

export function droneUnits(metres: number): number {
  return metres * DRONE_SCALE;
}

export function toKmh(metresPerSecond: number): number {
  return metresPerSecond * METRES_PER_SECOND_TO_KMH;
}

export function toMetresPerSecond(kmh: number): number {
  return kmh / METRES_PER_SECOND_TO_KMH;
}
