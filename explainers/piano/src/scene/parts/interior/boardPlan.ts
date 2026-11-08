import { lerp, smoothstep } from '@core/math';
import type { PlanPoint } from '@core/scene/geometry/extrude';
import { CASE, SOUNDBOARD } from '../../../model';
import { CASE_OUTLINE, insetOutline } from '../../geometry/outline';
import type { Ring } from '../../geometry/section';
import { isInside, lineCrossings } from '../../geometry/section';
import { BELLY_RAIL, BOARD, BRIDGE_PLAN } from './constants';
import { MAIN_BRIDGE } from './bridgePlan';
import {
  add,
  arcBelow,
  between,
  boundsOf,
  dot,
  edgeDistance,
  lastOf,
  leftOf,
  quad,
  spanAtZ,
  sub,
  unit,
} from './planMath';
import type { Bounds } from './planMath';
import { seeded } from './random';

const STEINER_EDGE_SHARE = 0.45;
const STEINER_JITTER = { share: 0.4, seed: 0xb0a2d } as const;
const SHORTEST_RIB = 0.08;
const RIB_TUCK = 0.0005;

export const INNER_RIM = insetOutline(CASE_OUTLINE, CASE.rimThickness);

function boardFront(): PlanPoint[] {
  const belly = SOUNDBOARD.bellyRailZ;
  const edge = MAIN_BRIDGE.front.map((point, index) =>
    add(point, MAIN_BRIDGE.normals[index], BRIDGE_PLAN.boardMargin),
  );
  const first = edge.findIndex((point) => point.z > belly);
  const before = edge[first - 1];
  const crossing = between(before, edge[first], (belly - before.z) / (edge[first].z - before.z));
  const ahead = edge.slice(first);
  const [left, right] = spanAtZ(INNER_RIM, belly);
  return [{ x: left, z: belly }, crossing, ...ahead, { x: right, z: lastOf(ahead).z }];
}

export const BOARD_RING: Ring = [
  ...boardFront(),
  ...arcBelow(INNER_RIM, SOUNDBOARD.bellyRailZ).slice(0, -1),
];

const BOARD_BOUNDS = boundsOf(BOARD_RING);

export function betweenRims(minZ: number, maxZ: number): Bounds {
  const [minX, maxX] = spanAtZ(INNER_RIM, maxZ);
  return { minX, maxX, minZ, maxZ };
}

export const BELLY_RAIL_BOUNDS = betweenRims(
  SOUNDBOARD.bellyRailZ - BELLY_RAIL.depth,
  SOUNDBOARD.bellyRailZ,
);

function steinerPoints(ring: Ring, step: number): PlanPoint[] {
  const points: PlanPoint[] = [];
  const { minX, maxX, minZ, maxZ } = BOARD_BOUNDS;
  const columns = Math.floor((maxX - minX) / step);
  const rows = Math.floor((maxZ - minZ) / step);
  const next = seeded(STEINER_JITTER.seed);
  const jitter = () => (next() - 1 / 2) * step * STEINER_JITTER.share;
  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      const point = {
        x: minX + (column + 1 / 2) * step + jitter(),
        z: minZ + (row + 1 / 2) * step + jitter(),
      };
      if (isInside([ring], point) && edgeDistance(point, ring) > step * STEINER_EDGE_SHARE) {
        points.push(point);
      }
    }
  }
  return points;
}

export const BOARD_STEINER: readonly PlanPoint[] = steinerPoints(BOARD_RING, BOARD.steinerStep);

const TAPER = Math.max(...BOARD_STEINER.map((point) => edgeDistance(point, BOARD_RING)));

export function boardThickness(point: PlanPoint): number {
  const share = smoothstep(edgeDistance(point, BOARD_RING) / TAPER);
  return lerp(BOARD.edgeThickness, BOARD.centreThickness, share);
}

export function boardBottom(point: PlanPoint): number {
  return SOUNDBOARD.topY - boardThickness(point);
}

export const GRAIN = unit(
  sub(MAIN_BRIDGE.centre[MAIN_BRIDGE.centre.length - 1], MAIN_BRIDGE.centre[0]),
);

export const BOARD_CENTRE: PlanPoint = {
  x: (BOARD_BOUNDS.minX + BOARD_BOUNDS.maxX) / 2,
  z: (BOARD_BOUNDS.minZ + BOARD_BOUNDS.maxZ) / 2,
};

export const BOARD_MODE: [number, number, number, number] = [
  BOARD_CENTRE.x,
  BOARD_CENTRE.z,
  2 / (BOARD_BOUNDS.maxX - BOARD_BOUNDS.minX),
  2 / (BOARD_BOUNDS.maxZ - BOARD_BOUNDS.minZ),
];

export interface Rib {
  readonly start: PlanPoint;
  readonly end: PlanPoint;
}

function ribs(): Rib[] {
  const inner = insetOutline(BOARD_RING, BOARD.ribInset);
  const across = leftOf(GRAIN);
  const reach = Math.max(
    ...BOARD_RING.map((point) => Math.abs(dot(sub(point, BOARD_CENTRE), GRAIN))),
  );
  const steps = Math.ceil(reach / SOUNDBOARD.ribSpacing);
  const found: Rib[] = [];
  for (let step = -steps; step <= steps; step += 1) {
    const origin = add(BOARD_CENTRE, GRAIN, step * SOUNDBOARD.ribSpacing);
    lineCrossings([inner], { origin, direction: across })
      .filter(([start, end]) => end - start > SHORTEST_RIB)
      .forEach(([start, end]) =>
        found.push({ start: add(origin, across, start), end: add(origin, across, end) }),
      );
  }
  return found;
}

export const RIBS: readonly Rib[] = ribs();
export const RIB_RINGS: readonly Ring[] = RIBS.map((rib) =>
  quad(rib.start, rib.end, BOARD.ribWidth),
);
export const RIB_LEVELS = {
  top: SOUNDBOARD.topY - BOARD.edgeThickness + RIB_TUCK,
  bottom: SOUNDBOARD.topY - BOARD.edgeThickness + RIB_TUCK - BOARD.ribHeight,
} as const;
