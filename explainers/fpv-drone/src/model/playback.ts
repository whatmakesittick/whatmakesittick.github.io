export const SPEED_RANGE = { min: 0.25, max: 4, step: 0.25, default: 1 } as const;

export function rate(speed: number): number {
  return speed;
}
