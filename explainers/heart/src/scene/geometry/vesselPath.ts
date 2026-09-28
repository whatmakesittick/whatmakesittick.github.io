import { CatmullRomCurve3, Vector3 } from 'three';
import type { Point } from '../../model';
import type { Vec3 } from './field';
import { sweptTube } from './field';
import type { Field } from './field';

export interface VesselRoute {
  readonly points: readonly Point[];
  readonly radius: number;
  readonly rootRadius?: number;
  readonly flareMm?: number;
}

export interface Portal {
  readonly centre: Vec3;
  readonly normal: Vec3;
  readonly radius: number;
  readonly beyond: readonly Vec3[];
}

const SAMPLE_MM = 2;
const TENSION = 0.5;

export function routeCurve(route: VesselRoute): CatmullRomCurve3 {
  return new CatmullRomCurve3(
    route.points.map((point) => new Vector3(...point)),
    false,
    'centripetal',
    TENSION,
  );
}

export function radiusAt(route: VesselRoute, distanceMm: number): number {
  const root = route.rootRadius ?? route.radius;
  const flare = route.flareMm ?? 0;
  if (flare <= 0 || distanceMm >= flare) return route.radius;
  const share = distanceMm / flare;
  const eased = share * share * (3 - 2 * share);
  return root + (route.radius - root) * eased;
}

export function pointAtDistance(curve: CatmullRomCurve3, distanceMm: number): Vector3 {
  const length = curve.getLength();
  return curve.getPointAt(Math.min(Math.max(distanceMm / length, 0), 1));
}

const BEYOND_MM = 40;

export function portalAt(route: VesselRoute, distanceMm: number, inset = 0): Portal {
  const curve = routeCurve(route);
  const share = Math.min(distanceMm / curve.getLength(), 1);
  const centre = curve.getPointAt(share);
  const normal = curve.getTangentAt(share).normalize();
  const steps = Math.ceil(BEYOND_MM / SAMPLE_MM);
  const beyond: Vec3[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const point = pointAtDistance(curve, distanceMm + step * SAMPLE_MM);
    beyond.push([point.x, point.y, point.z]);
  }
  return {
    centre: [centre.x, centre.y, centre.z],
    normal: [normal.x, normal.y, normal.z],
    radius: radiusAt(route, distanceMm) - inset,
    beyond,
  };
}

export function routeField(route: VesselRoute, untilMm: number, inset: number): Field {
  const curve = routeCurve(route);
  const steps = Math.max(1, Math.ceil(untilMm / SAMPLE_MM));
  const points: Vec3[] = [];
  const radii: number[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const distance = (untilMm * step) / steps;
    const point = pointAtDistance(curve, distance);
    points.push([point.x, point.y, point.z]);
    radii.push(radiusAt(route, distance) - inset);
  }
  return sweptTube(points, radii);
}
