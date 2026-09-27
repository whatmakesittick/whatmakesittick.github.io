const DEGREES_PER_HALF_TURN = 180;

export const FULL_TURN = Math.PI * 2;

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / DEGREES_PER_HALF_TURN;
}

export function toDegrees(radians: number): number {
  return (radians * DEGREES_PER_HALF_TURN) / Math.PI;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(from: number, to: number, share: number): number {
  return from * (1 - share) + to * share;
}

function progress(value: number, start: number, end: number): number {
  return clamp((value - start) / (end - start), 0, 1);
}

export function smoothstep(value: number, start = 0, end = 1): number {
  const share = progress(value, start, end);
  return share * share * (3 - 2 * share);
}

export function wrapAngle(radians: number): number {
  return radians - FULL_TURN * Math.round(radians / FULL_TURN);
}
