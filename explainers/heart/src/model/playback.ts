export const REAL_TIME_SPEED = 5;

const SLOW_MOTION_BASE = 2;
const MS_PER_SECOND = 1000;

export function slowMotionFactor(speed: number): number {
  return SLOW_MOTION_BASE ** (REAL_TIME_SPEED - speed);
}

export function beatMsPerSecond(speed: number): number {
  return MS_PER_SECOND / slowMotionFactor(speed);
}
