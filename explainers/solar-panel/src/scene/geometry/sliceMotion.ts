import { toRadians } from '@core/math';
import type { SliceLayerId } from '../../model';
import { CARRIER_FLOW, FINGER_UM, layerBottomUm, layerTopUm, um } from '../../model';
import { fingerTopCm } from './sliceGeometry';

export type CutSide = -1 | 1;

export interface SectionPoint {
  x: number;
  h: number;
}

export interface PhotonPath {
  outside: SectionPoint;
  inside: SectionPoint;
}

export type CarrierKind = 'electron' | 'hole';

type Tuple3 = readonly [number, number, number];

function unit(vector: SectionPoint): SectionPoint {
  const length = Math.hypot(vector.x, vector.h);
  return { x: vector.x / length, h: vector.h / length };
}

export function cutSide(tiltDeg: number, view: Tuple3): CutSide {
  const tilt = toRadians(tiltDeg);
  const southFace = -Math.sin(tilt) * view[1] + Math.cos(tilt) * view[2];
  return southFace >= 0 ? -1 : 1;
}

export function photonPath(sunLocal: Tuple3, siliconIndex: number): PhotonPath | null {
  const [x, , z] = sunLocal;
  if (z <= 0) return null;
  const outside = unit({ x: -x, h: -z });
  const sine = Math.abs(outside.x) / siliconIndex;
  const inside = { x: Math.sign(outside.x) * sine, h: -Math.sqrt(1 - sine * sine) };
  return { outside, inside };
}

function layerMiddle(id: SliceLayerId): number {
  return um((layerTopUm(id) + layerBottomUm(id)) / 2);
}

export function carrierRoute(kind: CarrierKind, start: SectionPoint): SectionPoint[] {
  const target = kind === 'electron' ? CARRIER_FLOW.electronsTo : CARRIER_FLOW.holesTo;
  if (target === 'rearContact') return [start, { x: start.x, h: layerMiddle('rearContact') }];
  const emitter = layerMiddle('emitter');
  const finger = um(FINGER_UM.x);
  return [
    start,
    { x: start.x, h: emitter },
    { x: finger, h: emitter },
    { x: finger, h: fingerTopCm() },
  ];
}

export function routeLength(route: readonly SectionPoint[]): number {
  let length = 0;
  for (let index = 1; index < route.length; index += 1) {
    length += Math.hypot(route[index].x - route[index - 1].x, route[index].h - route[index - 1].h);
  }
  return length;
}

export function pointOnRoute(route: readonly SectionPoint[], distance: number): SectionPoint {
  let remaining = Math.max(0, distance);
  for (let index = 1; index < route.length; index += 1) {
    const from = route[index - 1];
    const to = route[index];
    const length = Math.hypot(to.x - from.x, to.h - from.h);
    if (remaining <= length && length > 0) {
      const share = remaining / length;
      return { x: from.x + (to.x - from.x) * share, h: from.h + (to.h - from.h) * share };
    }
    remaining -= length;
  }
  return route[route.length - 1];
}
