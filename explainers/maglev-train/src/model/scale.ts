export const KMH_PER_MS = 3.6;

const MM_PER_METRE = 1000;

export function metres(value: number): number {
  return value;
}

export function mm(value: number): number {
  return value / MM_PER_METRE;
}

export function toKmh(metresPerSecond: number): number {
  return metresPerSecond * KMH_PER_MS;
}

export function toMs(kmh: number): number {
  return kmh / KMH_PER_MS;
}
