import { CYCLE_DEGREES, REVOLUTION_DEGREES, toRadians } from '../model';
import type { Point2 } from '../model';

export const DIAL_SIZE = 240;
export const DIAL_CENTRE = DIAL_SIZE / 2;

const DIAL_DEGREES_PER_CRANK_DEGREE = REVOLUTION_DEGREES / CYCLE_DEGREES;
const HALF_TURN = REVOLUTION_DEGREES / 2;

export function crankToDial(crankDegrees: number): number {
  return crankDegrees * DIAL_DEGREES_PER_CRANK_DEGREE;
}

export function dialPoint(radius: number, crankDegrees: number): Point2 {
  const theta = toRadians(crankToDial(crankDegrees));
  return {
    x: DIAL_CENTRE + radius * Math.sin(theta),
    y: DIAL_CENTRE - radius * Math.cos(theta),
  };
}

export function dialArc(radius: number, startCrank: number, spanCrank: number): string {
  const start = dialPoint(radius, startCrank);
  const end = dialPoint(radius, startCrank + spanCrank);
  const largeArc = crankToDial(spanCrank) > HALF_TURN ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function dialRotation(crankDegrees: number): string {
  return `rotate(${crankToDial(crankDegrees)} ${DIAL_CENTRE} ${DIAL_CENTRE})`;
}
