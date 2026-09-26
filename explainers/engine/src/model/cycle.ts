export { toDegrees, toRadians } from '@core/math';

export const CYCLE_DEGREES = 720;
export const REVOLUTION_DEGREES = 360;
export const STROKE_DEGREES = 180;
export const FIRING_TDC = 360;

export type Stroke = 'intake' | 'compression' | 'power' | 'exhaust';

export const STROKES: readonly Stroke[] = ['intake', 'compression', 'power', 'exhaust'];

export const STROKE_START: Record<Stroke, number> = {
  intake: 0,
  compression: 180,
  power: 360,
  exhaust: 540,
};

export function normalizeAngle(angle: number): number {
  return ((angle % CYCLE_DEGREES) + CYCLE_DEGREES) % CYCLE_DEGREES;
}

export function normalizeRevolution(angle: number): number {
  return ((angle % REVOLUTION_DEGREES) + REVOLUTION_DEGREES) % REVOLUTION_DEGREES;
}

export function strokeIndex(angle: number): number {
  return Math.floor(normalizeAngle(angle) / STROKE_DEGREES);
}

export function strokeAt(angle: number): Stroke {
  return STROKES[strokeIndex(angle)];
}

export function strokeProgress(angle: number): number {
  return (normalizeAngle(angle) % STROKE_DEGREES) / STROKE_DEGREES;
}

export function degreesForward(from: number, to: number): number {
  return normalizeAngle(to - from);
}

export function isWithinWindow(angle: number, start: number, duration: number): boolean {
  return degreesForward(start, angle) < duration;
}
