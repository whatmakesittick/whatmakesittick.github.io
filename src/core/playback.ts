const SLOW_MOTION_BASE = 2;

export function slowMotionFactor(speed: number, realTimeSpeed: number): number {
  return SLOW_MOTION_BASE ** (realTimeSpeed - speed);
}
