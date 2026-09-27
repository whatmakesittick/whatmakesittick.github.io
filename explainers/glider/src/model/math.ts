const FULL_TURN = Math.PI * 2;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(from: number, to: number, share: number): number {
  return from * (1 - share) + to * share;
}

export function wrapAngle(radians: number): number {
  return radians - FULL_TURN * Math.round(radians / FULL_TURN);
}

export function smoothstep(share: number): number {
  const t = clamp(share, 0, 1);
  return t * t * (3 - 2 * t);
}
