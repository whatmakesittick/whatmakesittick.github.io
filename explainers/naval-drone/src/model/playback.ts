export const SPEED_RANGE = { min: 0.25, max: 4, step: 0.25, default: 1 } as const;

const MODEL_SECONDS_PER_SECOND = 1;

export function rate(speed: number): number {
  return speed * MODEL_SECONDS_PER_SECOND;
}
