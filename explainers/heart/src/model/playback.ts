import { slowMotionFactor } from '@core/playback';

export const REAL_TIME_SPEED = 5;

const MS_PER_SECOND = 1000;

export function beatMsPerSecond(speed: number): number {
  return MS_PER_SECOND / slowMotionFactor(speed, REAL_TIME_SPEED);
}
