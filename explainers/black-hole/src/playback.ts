export const SPEED_RANGE = { min: 0, max: 5, step: 1, default: 3 } as const;
export const REAL_TIME_SPEED = SPEED_RANGE.min;

const PLAYBACK_FACTORS = [1, 2, 4, 8, 16, 32] as const;

export function playbackFactor(speed: number): number {
  return PLAYBACK_FACTORS[speed] ?? PLAYBACK_FACTORS[0];
}
