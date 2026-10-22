import { BODY, JOINT, NOSE, NOSE_REACH } from './constants';
import type { ContourRow } from './profile';

export type EndKind = 'joint' | 'nose' | 'open';

export interface SectionEnds {
  readonly rearX: number;
  readonly frontX: number;
  readonly rear: EndKind;
  readonly front: EndKind;
}

export type Vec3 = [number, number, number];

export function superEllipse(share: number, power: number): number {
  if (share >= 1) return 1;
  if (share <= 0) return 0;
  return (1 - (1 - share) ** power) ** (1 / power);
}

export function noseRoof(distance: number): number {
  const shape = superEllipse(distance / NOSE.roofLength, NOSE.roofPower);
  return NOSE.tipTop + (BODY.roofY - NOSE.tipTop) * shape;
}

export function noseFloor(distance: number): number {
  const shape = superEllipse(distance / NOSE.floorLength, NOSE.floorPower);
  return NOSE.tipBottom - (NOSE.tipBottom - BODY.floorY) * shape;
}

export function noseReach(h: number): number {
  const rise = Math.max(0, h) ** NOSE.widthCurve;
  return NOSE.widthLengthLow + (NOSE.widthLengthHigh - NOSE.widthLengthLow) * rise;
}

export function noseWidth(distance: number, h: number): number {
  return superEllipse(distance / noseReach(h), NOSE.widthPower);
}

export function noseBelly(row: ContourRow, distance: number): number {
  const near = (1 - Math.min(1, distance / NOSE.bellyLength)) ** 2;
  const outward = (row.z / BODY.halfWidth) ** 2;
  return NOSE.bellyLift * near * outward * (1 - row.h) ** NOSE.bellyFocus;
}

export function nosePoint(row: ContourRow, distance: number): [z: number, y: number] {
  const floor = noseFloor(distance);
  const y = floor + row.h * (noseRoof(distance) - floor) + noseBelly(row, distance);
  return [row.z * noseWidth(distance, row.h), y];
}

export function edgeInset(distance: number): number {
  const radius = JOINT.edgeRadius;
  if (distance >= radius) return 0;
  const reach = radius - Math.max(0, distance);
  return radius - Math.sqrt(radius * radius - reach * reach);
}

function jointInset(x: number, ends: SectionEnds): number {
  const rear = ends.rear === 'joint' ? edgeInset(x - ends.rearX) : 0;
  const front = ends.front === 'joint' ? edgeInset(ends.frontX - x) : 0;
  return Math.max(rear, front);
}

export function noseDistance(x: number, ends: SectionEnds): number | null {
  if (ends.front === 'nose' && ends.frontX - x < NOSE_REACH) return Math.max(0, ends.frontX - x);
  if (ends.rear === 'nose' && x - ends.rearX < NOSE_REACH) return Math.max(0, x - ends.rearX);
  return null;
}

export function surfacePoint(row: ContourRow, x: number, ends: SectionEnds, inset = 0): Vec3 {
  const distance = noseDistance(x, ends);
  if (distance !== null) {
    const [z, y] = nosePoint(row, distance);
    return [x, y, z];
  }
  const depth = jointInset(x, ends) + inset;
  return [x, row.y - row.ny * depth, row.z - row.nz * depth];
}
