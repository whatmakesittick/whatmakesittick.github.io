export const REAL_TIME_SPEED = 3;

const SPEED_STOP_FACTOR = 2;

export function playbackFactor(speed: number): number {
  return SPEED_STOP_FACTOR ** (speed - REAL_TIME_SPEED);
}

export function burnSecondsPerSecond(speed: number): number {
  return playbackFactor(speed);
}
