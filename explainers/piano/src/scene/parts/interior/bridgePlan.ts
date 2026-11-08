import { CatmullRomCurve3, Vector3 } from 'three';
import { lerp } from '@core/math';
import type { PlanPoint } from '@core/scene/geometry/extrude';
import { BRIDGE, KEYS, STRINGS, stringDirection, stringPath } from '../../../model';
import { BRIDGE_PLAN } from './constants';
import { add, dot, leftOf, plan, sub, unit } from './planMath';

export interface BridgeBand {
  readonly centre: readonly PlanPoint[];
  readonly normals: readonly PlanPoint[];
  readonly tangents: readonly PlanPoint[];
  readonly ring: readonly PlanPoint[];
  readonly front: readonly PlanPoint[];
  readonly back: readonly PlanPoint[];
}

const FIRST_KEY = 1;
const STEEL_FIRST_KEY = STRINGS.bassTopKey + 1;
const CURVE_TYPE = 'centripetal';

function keyRange(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

function extended(points: readonly PlanPoint[], distance: number): PlanPoint[] {
  const head = unit(sub(points[0], points[1]));
  const tail = unit(sub(points[points.length - 1], points[points.length - 2]));
  return [
    add(points[0], head, distance),
    ...points,
    add(points[points.length - 1], tail, distance),
  ];
}

function sampled(points: readonly PlanPoint[], samples: number): PlanPoint[] {
  const curve = new CatmullRomCurve3(
    points.map(({ x, z }) => new Vector3(x, 0, z)),
    false,
    CURVE_TYPE,
  );
  return curve.getSpacedPoints(samples).map(({ x, z }) => ({ x, z }));
}

function tangentAt(points: readonly PlanPoint[], index: number): PlanPoint {
  const before = points[Math.max(0, index - 1)];
  const after = points[Math.min(points.length - 1, index + 1)];
  return unit(sub(after, before));
}

export function behindBack(band: BridgeBand, distance: number, extension: number): PlanPoint[] {
  const edge = band.back.map((point, index) => add(point, band.normals[index], -distance));
  const last = edge.length - 1;
  edge[0] = add(edge[0], band.tangents[0], -extension);
  edge[last] = add(edge[last], band.tangents[last], extension);
  return edge;
}

type FrontShare = (along: number) => number;

function smoothed(points: readonly PlanPoint[]): PlanPoint[] {
  return points.map((_, index) => {
    const reach = Math.min(BRIDGE_PLAN.smoothing, index, points.length - 1 - index);
    const window = points.slice(index - reach, index + reach + 1);
    return {
      x: window.reduce((sum, point) => sum + point.x, 0) / window.length,
      z: window.reduce((sum, point) => sum + point.z, 0) / window.length,
    };
  });
}

function sectionPoints(sections: readonly (readonly number[])[]): PlanPoint[] {
  return sections.flatMap((keys) => smoothed(keys.map((key) => plan(stringPath(key).back))));
}

function bridgeBand(
  sections: readonly (readonly number[])[],
  samples: number,
  frontShare: FrontShare,
): BridgeBand {
  const centre = sampled(extended(sectionPoints(sections), BRIDGE_PLAN.overhang), samples);
  const keys = sections[0];
  const strings = plan(stringDirection(keys[0]));
  const tangents = centre.map((_, index) => tangentAt(centre, index));
  const normals = tangents.map((tangent) => {
    const side = leftOf(tangent);
    return dot(side, strings) < 0 ? side : { x: -side.x, z: -side.z };
  });
  const share = (index: number) => frontShare(index / (centre.length - 1));
  const front = centre.map((point, index) =>
    add(point, normals[index], BRIDGE.width * share(index)),
  );
  const back = centre.map((point, index) =>
    add(point, normals[index], -BRIDGE.width * (1 - share(index))),
  );
  return { centre, normals, tangents, front, back, ring: [...front, ...back.slice().reverse()] };
}

export const MAIN_BRIDGE = bridgeBand(
  [keyRange(STEEL_FIRST_KEY, STRINGS.tenorTopKey), keyRange(STRINGS.tenorTopKey + 1, KEYS)],
  BRIDGE_PLAN.mainSamples,
  (along) => lerp(BRIDGE_PLAN.frontShare.tenor, BRIDGE_PLAN.frontShare.treble, along),
);
export const BASS_BRIDGE = bridgeBand(
  [keyRange(FIRST_KEY, STRINGS.bassTopKey)],
  BRIDGE_PLAN.bassSamples,
  () => BRIDGE_PLAN.frontShare.bass,
);

export function bridgeOf(key: number): BridgeBand {
  return key <= STRINGS.bassTopKey ? BASS_BRIDGE : MAIN_BRIDGE;
}
