const SLOW_MOTION_BASE = 2;

export function slowMotionFactor(
  speed: number,
  realTimeSpeed: number,
  base = SLOW_MOTION_BASE,
): number {
  return base ** (realTimeSpeed - speed);
}
