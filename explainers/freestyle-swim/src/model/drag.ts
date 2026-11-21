export const DRAG_K = 27;
export const HEAD_UP_DRAG_FACTOR = 3;
export const WHAT_IF_RANGE = { min: 1.0, max: 2.4, step: 0.1, default: 1.5 } as const;

export function activeDragN(speedMs: number): number {
  return DRAG_K * speedMs ** 2;
}

export function dragPowerW(speedMs: number): number {
  return activeDragN(speedMs) * speedMs;
}

export function dragFactor(headUp: boolean): number {
  return headUp ? HEAD_UP_DRAG_FACTOR : 1;
}
