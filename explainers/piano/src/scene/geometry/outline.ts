import { CatmullRomCurve3, Vector3 } from 'three';
import type { PlanPoint } from '@core/scene/geometry/extrude';
import { CASE } from '../../model';

type Corner = readonly [x: number, z: number];

const CURVE_SAMPLES = 64;

const BENTSIDE_AND_TAIL: readonly Corner[] = [
  [CASE.rightX, CASE.bentsideStartZ],
  [0.63, -0.84],
  [0.44, -1.14],
  [0.28, -1.5],
  [0.17, -1.85],
  [0.1, -2.15],
  [0.01, -2.45],
  [-0.17, -2.66],
  [-0.42, CASE.tailZ],
  [-0.63, -2.69],
  [-0.75, -2.53],
  [CASE.leftX, -2.3],
];

function sampledCurve(): PlanPoint[] {
  const curve = new CatmullRomCurve3(
    BENTSIDE_AND_TAIL.map(([x, z]) => new Vector3(x, 0, z)),
    false,
    'centripetal',
  );
  return curve.getPoints(CURVE_SAMPLES).map(({ x, z }) => ({ x, z }));
}

export const CASE_OUTLINE: readonly PlanPoint[] = [
  { x: CASE.leftX, z: CASE.frontZ },
  { x: CASE.rightX, z: CASE.frontZ },
  ...sampledCurve(),
];

function signedArea(points: readonly PlanPoint[]): number {
  return points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.z - next.x * point.z;
  }, 0);
}

function edgeNormal(from: PlanPoint, to: PlanPoint, side: number): PlanPoint {
  const length = Math.hypot(to.x - from.x, to.z - from.z) || 1;
  return { x: (side * (to.z - from.z)) / length, z: (side * -(to.x - from.x)) / length };
}

export function insetOutline(points: readonly PlanPoint[], distance: number): PlanPoint[] {
  const side = signedArea(points) > 0 ? -1 : 1;
  return points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const a = edgeNormal(previous, point, side);
    const b = edgeNormal(point, next, side);
    const bisector = { x: a.x + b.x, z: a.z + b.z };
    const length = Math.hypot(bisector.x, bisector.z) || 1;
    const unit = { x: bisector.x / length, z: bisector.z / length };
    const miter = distance / Math.max(unit.x * a.x + unit.z * a.z, 0.2);
    return { x: point.x + unit.x * miter, z: point.z + unit.z * miter };
  });
}
