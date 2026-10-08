import { smoothstep } from '@core/math';
import { FIELD_KINDS } from './fieldConstants';
import type { FieldPlan, Run } from './fieldPlan';
import { centroid, cutPolygon, extents } from './polygon';
import type { Cut, Polygon } from './polygon';
import { between } from './random';
import type { Random } from './random';

export interface Parcel {
  readonly corners: Polygon;
  readonly angle: number;
  readonly kind: number;
  readonly tone: number;
}

export interface Parcels {
  readonly parcels: readonly Parcel[];
  readonly boundaries: readonly Run[];
}

const QUARTER_TURN = Math.PI / 2;
function pickKind(random: Random, weights: readonly number[]): number {
  let remaining = random() * weights.reduce((sum, weight) => sum + weight, 0);
  const index = weights.findIndex((weight) => (remaining -= weight) < 0);
  return index < 0 ? FIELD_KINDS.length - 1 : index;
}

function sizeScale(plan: FieldPlan, x: number, z: number): number {
  if (!plan.near) return 1;
  const { scale, from, to } = plan.near;
  return scale + (1 - scale) * smoothstep(Math.hypot(x, z), from, to);
}

function boundsPolygon({ minX, maxX, minZ, maxZ }: FieldPlan['bounds']): Polygon {
  return [
    [minX, minZ],
    [maxX, minZ],
    [maxX, maxZ],
    [minX, maxZ],
  ];
}

function longestEdgeAngle(corners: Polygon): number {
  let [best, angle] = [0, 0];
  corners.forEach(([x, z], index) => {
    const [nx, nz] = corners[(index + 1) % corners.length];
    const length = Math.hypot(nx - x, nz - z);
    if (length > best) [best, angle] = [length, Math.atan2(nz - z, nx - x)];
  });
  return angle;
}

function cutAcross(
  plan: FieldPlan,
  corners: Polygon,
  angle: number,
  random: Random,
): Cut | undefined {
  const [cx, cz] = centroid(corners);
  const { along, across } = extents(corners, angle);
  const wide = along[1] - along[0] >= across[1] - across[0];
  const axis = wide ? angle : angle + QUARTER_TURN;
  const [from, to] = wide ? along : across;
  const shift =
    from +
    (to - from) * between(random, plan.cutShare) -
    (cx * Math.cos(axis) + cz * Math.sin(axis));
  const tilt = axis + (random() * 2 - 1) * plan.cutJitter;
  return cutPolygon(
    corners,
    [cx + Math.cos(axis) * shift, cz + Math.sin(axis) * shift],
    [Math.cos(tilt), Math.sin(tilt)],
  );
}

export function splitParcels(plan: FieldPlan, random: Random): Parcels {
  const parcels: Parcel[] = [];
  const boundaries: Run[] = [];
  const pickAngle = () => plan.angles[Math.floor(random() * plan.angles.length)];
  const split = (corners: Polygon) => {
    const [cx, cz] = centroid(corners);
    const blockAngle = pickAngle();
    const fieldAngle = longestEdgeAngle(corners);
    const { along, across } = extents(corners, fieldAngle);
    const longest = Math.max(along[1] - along[0], across[1] - across[0]);
    const block = longest > plan.block;
    const angle = block ? blockAngle : fieldAngle;
    const cut =
      longest > between(random, plan.size) * sizeScale(plan, cx, cz) &&
      cutAcross(plan, corners, angle, random);
    if (!cut) {
      parcels.push({
        corners,
        angle: fieldAngle,
        kind: pickKind(random, plan.look.weights),
        tone: random(),
      });
      return;
    }
    boundaries.push({ from: cut.chord[0], to: cut.chord[1] });
    cut.sides.forEach(split);
  };
  split(boundsPolygon(plan.bounds));
  return { parcels, boundaries };
}
