import { CatmullRomCurve3, Vector3 } from 'three';
import type { Point } from '../../model';

export type BloodZone = 'vein' | 'atrium' | 'ventricle' | 'artery';

export interface PathLeg {
  readonly points: readonly Point[];
  readonly radius: number;
  readonly zone: BloodZone;
  readonly chamber: boolean;
}

export interface BloodPath {
  readonly points: readonly Vector3[];
  readonly radii: Float32Array;
  readonly zones: readonly BloodZone[];
  readonly inChamber: Uint8Array;
  readonly length: number;
  readonly gates: Readonly<Record<BloodZone, number>>;
}

const SAMPLE_MM = 2;

interface Waypoint {
  readonly point: Vector3;
  readonly radius: number;
  readonly zone: BloodZone;
  readonly chamber: boolean;
}

function waypoints(legs: readonly PathLeg[]): Waypoint[] {
  const result: Waypoint[] = [];
  for (const leg of legs) {
    for (const point of leg.points) {
      const vector = new Vector3(...point);
      const previous = result[result.length - 1];
      if (previous && previous.point.distanceTo(vector) < 1e-3) continue;
      result.push({ point: vector, radius: leg.radius, zone: leg.zone, chamber: leg.chamber });
    }
  }
  return result;
}

const LENGTH_DIVISIONS = 400;

function waypointDistances(curve: CatmullRomCurve3, count: number): number[] {
  const lengths = curve.getLengths(LENGTH_DIVISIONS);
  return Array.from(
    { length: count },
    (_, index) => lengths[Math.round((index / (count - 1)) * LENGTH_DIVISIONS)],
  );
}

export function bloodPath(legs: readonly PathLeg[]): BloodPath {
  const marks = waypoints(legs);
  const curve = new CatmullRomCurve3(
    marks.map((mark) => mark.point),
    false,
    'centripetal',
  );
  const length = curve.getLength();
  const at = waypointDistances(curve, marks.length);
  const gates: Record<BloodZone, number> = {
    vein: 0,
    atrium: length,
    ventricle: length,
    artery: length,
  };
  marks.forEach((mark, index) => {
    if (index > 0 && mark.zone !== marks[index - 1].zone) gates[mark.zone] = at[index];
  });
  const count = Math.max(2, Math.ceil(length / SAMPLE_MM));
  const points = curve.getSpacedPoints(count);
  const radii = new Float32Array(points.length);
  const inChamber = new Uint8Array(points.length);
  const zones: BloodZone[] = [];
  let mark = 0;
  points.forEach((_, index) => {
    const distance = (index / count) * length;
    while (mark < marks.length - 2 && at[mark + 1] <= distance) mark += 1;
    const span = at[mark + 1] - at[mark] || 1;
    const share = Math.min(Math.max((distance - at[mark]) / span, 0), 1);
    radii[index] = marks[mark].radius + (marks[mark + 1].radius - marks[mark].radius) * share;
    inChamber[index] = marks[mark].chamber || marks[mark + 1].chamber ? 1 : 0;
    zones.push(zoneAtGates(gates, distance));
  });
  return { points, radii, zones, inChamber, length, gates };
}

function zoneAtGates(gates: Readonly<Record<BloodZone, number>>, distance: number): BloodZone {
  if (distance >= gates.artery) return 'artery';
  if (distance >= gates.ventricle) return 'ventricle';
  if (distance >= gates.atrium) return 'atrium';
  return 'vein';
}

export function sampleAt(path: BloodPath, distance: number): number {
  const last = path.points.length - 1;
  return Math.min(Math.max((distance / path.length) * last, 0), last);
}

export function zoneAt(path: BloodPath, distance: number): BloodZone {
  return zoneAtGates(path.gates, distance);
}

export function pointOnPath(path: BloodPath, distance: number, out: Vector3): Vector3 {
  const position = sampleAt(path, distance);
  const from = Math.floor(position);
  const to = Math.min(from + 1, path.points.length - 1);
  return out.copy(path.points[from]).lerp(path.points[to], position - from);
}

export function tangentOnPath(path: BloodPath, distance: number, out: Vector3): Vector3 {
  const position = sampleAt(path, distance);
  const from = Math.min(Math.floor(position), path.points.length - 2);
  return out
    .copy(path.points[from + 1])
    .sub(path.points[from])
    .normalize();
}
