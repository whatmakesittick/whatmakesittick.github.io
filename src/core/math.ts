const DEGREES_PER_HALF_TURN = 180;

export const FULL_TURN = Math.PI * 2;

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / DEGREES_PER_HALF_TURN;
}

export function toDegrees(radians: number): number {
  return (radians * DEGREES_PER_HALF_TURN) / Math.PI;
}
