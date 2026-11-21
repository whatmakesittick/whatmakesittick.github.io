import { Vector3 } from 'three';
import type { Figure } from '@core/figure';
import { smoothstep } from '@core/math';
import type { RestFrame } from './restFrame';

const AXES = 3;
export const CHANNELS = 4;
export const RIGHT_X = -1;
const SPINE_HEIGHT = new Vector3(0, 1, 0);

export const JAMMERS = {
  waistAboveRoot: 0.05,
  kneeHemAlongThigh: 0.4,
} as const;

export const CAP = {
  frontAboveEye: 0.047,
  sideAboveEye: 0.005,
  backAboveHead: 0.012,
  sideAzimuthRad: 1.75,
  stripeHalfWidth: 0.007,
} as const;

export const STRAP = {
  halfWidth: 0.009,
  startAzimuthRad: 0.5,
  centreAboveHead: 0.105,
  elevationRad: { constant: -0.0431, first: 0.0375, second: -0.2694 },
  headReach: 0.14,
} as const;

export const BAND = {
  centreFromWrist: 0.035,
  halfWidth: 0.009,
  reach: 0.06,
} as const;

export interface GarmentFields {
  readonly distances: Float32Array;
  readonly extents: Float32Array;
}

export interface Hems {
  waist: { origin: Vector3; axis: Vector3 };
  thighs: readonly { origin: Vector3; axis: Vector3 }[];
  head: { centre: Vector3; up: Vector3; eyeY: number; headY: number };
  wrist: { origin: Vector3; axis: Vector3 };
}

function axisBetween(frame: RestFrame, from: string, to: string): Vector3 {
  return frame.joint(to).sub(frame.joint(from)).normalize();
}

export function hemsOf(frame: RestFrame): Hems {
  const thigh = (side: string) => ({
    origin: frame.joint(`${side}_upleg`),
    axis: axisBetween(frame, `${side}_upleg`, `${side}_lowleg`),
  });
  return {
    waist: { origin: frame.joint('root'), axis: SPINE_HEIGHT },
    thighs: [thigh('l'), thigh('r')],
    head: {
      centre: frame.joint('c_head'),
      up: axisBetween(frame, 'c_head', 'c_head_null'),
      eyeY: frame.joint('r_eye').y,
      headY: frame.joint('c_head').y,
    },
    wrist: { origin: frame.joint('r_wrist'), axis: axisBetween(frame, 'r_lowarm', 'r_wrist') },
  };
}

function along(point: Vector3, origin: Vector3, axis: Vector3, scratch: Vector3): number {
  return scratch.copy(point).sub(origin).dot(axis);
}

function jammerDistance(point: Vector3, hems: Hems, scratch: Vector3): number {
  const waist = JAMMERS.waistAboveRoot - along(point, hems.waist.origin, hems.waist.axis, scratch);
  const thigh = hems.thighs[point.x * RIGHT_X > 0 ? 1 : 0];
  const knee = JAMMERS.kneeHemAlongThigh - along(point, thigh.origin, thigh.axis, scratch);
  return Math.min(waist, knee);
}

export function azimuthOf(point: Vector3, centre: Vector3): number {
  return Math.abs(Math.atan2(point.x - centre.x, point.z - centre.z));
}

export function capHemHeight(azimuth: number, head: Hems['head']): number {
  const front = head.eyeY + CAP.frontAboveEye;
  const side = head.eyeY + CAP.sideAboveEye;
  const back = head.headY + CAP.backAboveHead;
  if (azimuth < CAP.sideAzimuthRad) {
    return front + (side - front) * smoothstep(azimuth, 0, CAP.sideAzimuthRad);
  }
  return side + (back - side) * smoothstep(azimuth, CAP.sideAzimuthRad, Math.PI);
}

function capDistance(point: Vector3, head: Hems['head']): number {
  const hem = capHemHeight(azimuthOf(point, head.centre), head);
  return point.y - hem;
}

function strapElevation(azimuth: number): number {
  const { constant, first, second } = STRAP.elevationRad;
  return constant + first * Math.cos(azimuth) + second * Math.cos(2 * azimuth);
}

function strapOffset(point: Vector3, head: Hems['head']): Vector3 {
  const centre = head.centre.clone().addScaledVector(head.up, STRAP.centreAboveHead);
  return point.clone().sub(centre);
}

function strapAcross(point: Vector3, head: Hems['head']): number {
  const offset = strapOffset(point, head);
  const elevation = Math.atan2(offset.y, Math.hypot(offset.x, offset.z));
  const azimuth = azimuthOf(point, head.centre);
  return offset.length() * (elevation - strapElevation(azimuth));
}

function strapAlong(point: Vector3, head: Hems['head']): number {
  const offset = strapOffset(point, head);
  const fromStart =
    (azimuthOf(point, head.centre) - STRAP.startAzimuthRad) * Math.hypot(offset.x, offset.z);
  return Math.min(fromStart, STRAP.headReach - offset.length());
}

function wristOffset(point: Vector3, hems: Hems, scratch: Vector3): number {
  const { origin, axis } = hems.wrist;
  return along(point, origin, axis, scratch);
}

function bandReach(point: Vector3, hems: Hems, scratch: Vector3): number {
  const { origin, axis } = hems.wrist;
  const slab = wristOffset(point, hems, scratch);
  const radial = scratch.copy(point).sub(origin).addScaledVector(axis, -slab);
  return BAND.reach - radial.length();
}

export function garmentFields(figure: Figure, frame: RestFrame): GarmentFields {
  const hems = hemsOf(frame);
  const distances = new Float32Array(figure.vertexCount * CHANNELS);
  const extents = new Float32Array(figure.vertexCount * CHANNELS);
  const point = new Vector3();
  const scratch = new Vector3();
  for (let v = 0; v < figure.vertexCount; v++) {
    const at = v * CHANNELS;
    point.fromArray(figure.restPositions, v * AXES);
    distances[at] = jammerDistance(point, hems, scratch);
    distances[at + 1] = capDistance(point, hems.head);
    distances[at + 2] = point.x - hems.head.centre.x;
    distances[at + 3] = strapAcross(point, hems.head);
    extents[at] = strapAlong(point, hems.head);
    extents[at + 1] = wristOffset(point, hems, scratch) + BAND.centreFromWrist;
    extents[at + 2] = bandReach(point, hems, scratch);
  }
  return { distances, extents };
}
