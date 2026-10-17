export const METRES_PER_SECOND_TO_KMH = 3.6;

export function metres(value: number): number {
  return value;
}

export function toKmh(metresPerSecond: number): number {
  return metresPerSecond * METRES_PER_SECOND_TO_KMH;
}
