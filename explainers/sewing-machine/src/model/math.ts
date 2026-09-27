export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(from: number, to: number, share: number): number {
  return from * (1 - share) + to * share;
}

function progress(value: number, start: number, end: number): number {
  return clamp((value - start) / (end - start), 0, 1);
}

export function smoothstep(value: number, start: number, end: number): number {
  const share = progress(value, start, end);
  return share * share * (3 - 2 * share);
}
