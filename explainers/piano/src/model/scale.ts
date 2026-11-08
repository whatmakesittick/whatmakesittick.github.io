export const MM_PER_M = 1000;
export const MS_PER_SECOND = 1000;

export function mm(value: number): number {
  return value / MM_PER_M;
}

export function toSeconds(ms: number): number {
  return ms / MS_PER_SECOND;
}

export function toMs(seconds: number): number {
  return seconds * MS_PER_SECOND;
}

export function mmPerMs(metresPerSecond: number): number {
  return (metresPerSecond * MM_PER_M) / MS_PER_SECOND;
}

export function metresPerSecond(mmPerMillisecond: number): number {
  return (mmPerMillisecond * MS_PER_SECOND) / MM_PER_M;
}
