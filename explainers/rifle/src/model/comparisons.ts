import { CAR_SPEED_MS, CYCLE_MS, MS_PER_SECOND, SOUND_SPEED_MS } from './constants';

export type MovingComparison = 'sound' | 'car';

const COMPARISON_SPEEDS: Readonly<Record<MovingComparison, number>> = {
  sound: SOUND_SPEED_MS,
  car: CAR_SPEED_MS,
};

export function metresInOneCycle(speed: number): number {
  return (speed * CYCLE_MS) / MS_PER_SECOND;
}

export const CYCLE_DISTANCES: Readonly<Record<MovingComparison, number>> = {
  sound: metresInOneCycle(COMPARISON_SPEEDS.sound),
  car: metresInOneCycle(COMPARISON_SPEEDS.car),
};
