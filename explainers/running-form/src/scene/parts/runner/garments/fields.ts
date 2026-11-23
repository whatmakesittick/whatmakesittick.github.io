import { Vector3 } from 'three';
import type { Figure } from '@core/figure';
import { partWeights, partsOf } from '@core/figure/body/figureBody';
import type { PartRule } from '@core/figure/body/figureBody';
import { along, axisBetween, azimuthOf } from '@core/figure/body/hems';
import type { RestFrame } from '@core/figure/body/restFrame';
import { clamp, smoothstep } from '@core/math';
import type { SideId } from '../../../../ids';
import { CAP, HAIR, SHORTS, SINGLET, SOCKS, WAIST } from './cut';
import { skinFlush } from './flush';

export const CHANNELS = 4;
const AXES = 3;
const OUTSIDE = -1;
const HALF_TURN = Math.PI / 2;

export interface RunnerFields {
  readonly distances: Float32Array;
  readonly extents: Float32Array;
  readonly extra: Float32Array;
}

interface Limb {
  readonly origin: Vector3;
  readonly axis: Vector3;
  readonly lateral: Vector3;
}

interface Head {
  readonly centre: Vector3;
  readonly eyeY: number;
  readonly headY: number;
}

interface Landmarks {
  readonly thighs: Readonly<Record<SideId, Limb>>;
  readonly shins: Readonly<Record<SideId, Limb>>;
  readonly head: Head;
}

const PREFIX: Readonly<Record<SideId, string>> = { right: 'r', left: 'l' };
const LATERAL: Readonly<Record<SideId, Vector3>> = {
  right: new Vector3(-1, 0, 0),
  left: new Vector3(1, 0, 0),
};

function sideOf(point: Vector3): SideId {
  return point.x < 0 ? 'right' : 'left';
}

function limb(frame: RestFrame, side: SideId, from: string, to: string): Limb {
  const p = PREFIX[side];
  const axis = axisBetween(frame, `${p}_${from}`, `${p}_${to}`);
  const lateral = LATERAL[side].clone().addScaledVector(axis, -LATERAL[side].dot(axis)).normalize();
  return { origin: frame.joint(`${p}_${from}`), axis, lateral };
}

function landmarks(frame: RestFrame): Landmarks {
  const head = frame.joint('c_head');
  const top = frame.joint('c_head_null');
  return {
    thighs: {
      right: limb(frame, 'right', 'upleg', 'lowleg'),
      left: limb(frame, 'left', 'upleg', 'lowleg'),
    },
    shins: {
      right: limb(frame, 'right', 'foot', 'lowleg'),
      left: limb(frame, 'left', 'foot', 'lowleg'),
    },
    head: {
      centre: new Vector3(0, (head.y + top.y) / 2, head.z),
      eyeY: frame.joint('r_eye').y,
      headY: head.y,
    },
  };
}

function ellipseDistance(dx: number, dy: number, rx: number, ry: number): number {
  const k = Math.hypot(dx / rx, dy / ry);
  const gradient = Math.hypot(dx / (rx * rx), dy / (ry * ry)) / Math.max(k, 1e-6);
  return (k - 1) / Math.max(gradient, 1e-6);
}

function armholeInside(point: Vector3): number {
  const { armhole } = SINGLET;
  const back = smoothstep(point.z, armhole.backZ + armhole.blendM, armhole.backZ - armhole.blendM);
  const centreX = armhole.centreX - armhole.racerBackShiftM * back;
  const side = Math.abs(point.x) - centreX;
  const rise = point.y - armhole.centreY;
  const ellipse = -ellipseDistance(side, rise, armhole.radiusX, armhole.radiusY);
  return Math.max(ellipse, Math.min(side, rise + armhole.radiusY));
}

function neckInside(point: Vector3): number {
  const { neck } = SINGLET;
  const front = smoothstep(point.z, -neck.blendM, neck.blendM);
  const radiusX = neck.backRadiusX + (neck.frontRadiusX - neck.backRadiusX) * front;
  const radiusY = neck.backRadiusY + (neck.frontRadiusY - neck.backRadiusY) * front;
  const rise = point.y - neck.centreY;
  return Math.max(-ellipseDistance(point.x, rise, radiusX, radiusY), rise);
}

function sidePanel(point: Vector3): number {
  const { panel } = SINGLET;
  const dz = point.z - panel.centreZ;
  const azimuth = Math.atan2(Math.abs(point.x), dz);
  return Math.hypot(point.x, dz) * (panel.halfAngleRad - Math.abs(azimuth - HALF_TURN));
}

function legHem(point: Vector3, thigh: Limb, scratch: Vector3): number {
  const reach = along(point, thigh.origin, thigh.axis, scratch);
  const radial = scratch.copy(point).sub(thigh.origin).addScaledVector(thigh.axis, -reach);
  const azimuth = Math.acos(clamp(radial.normalize().dot(thigh.lateral), -1, 1));
  const notch = Math.max(1 - (azimuth / SHORTS.splitHalfRad) ** 2, 0);
  return SHORTS.hemAlongM - SHORTS.splitM * Math.sqrt(notch) - reach;
}

function capHem(azimuth: number, head: Head): number {
  const front = head.eyeY + CAP.frontAboveEyeM;
  const side = head.eyeY + CAP.sideAboveEyeM;
  const back = head.headY + CAP.backAboveHeadM;
  if (azimuth < CAP.sideAzimuthRad) {
    return front + (side - front) * smoothstep(azimuth, 0, CAP.sideAzimuthRad);
  }
  return side + (back - side) * smoothstep(azimuth, CAP.sideAzimuthRad, Math.PI);
}

function hairline(azimuth: number, head: Head): number {
  const [burnFrom, burnTo] = HAIR.sideburnAzimuthRad;
  const [, earTo] = HAIR.earAzimuthRad;
  const forehead = head.eyeY + CAP.frontAboveEyeM + 0.02;
  const burn = head.eyeY + HAIR.sideburnAboveEyeM;
  const overEar = head.eyeY + HAIR.overEarAboveEyeM;
  const nape = head.headY + HAIR.napeAboveHeadM;
  if (azimuth < burnFrom) return forehead + (burn - forehead) * smoothstep(azimuth, 1.0, burnFrom);
  if (azimuth < burnTo) return burn + (overEar - burn) * smoothstep(azimuth, burnTo - 0.08, burnTo);
  if (azimuth < earTo) return overEar;
  return overEar + (nape - overEar) * smoothstep(azimuth, earTo, HAIR.napeAzimuthRad);
}

function hair(point: Vector3, head: Head): number {
  const azimuth = azimuthOf(point, head.centre);
  const above = point.y - hairline(azimuth, head);
  const [earFrom, earTo] = HAIR.earAzimuthRad;
  const [bandFrom, bandTo] = HAIR.earBand;
  const onEar =
    azimuth > earFrom - 0.1 && azimuth < earTo + 0.1 && point.y > bandFrom && point.y < bandTo;
  if (!onEar) return above;
  const radius = Math.hypot(point.x - head.centre.x, point.z - head.centre.z);
  return Math.min(above, HAIR.earRadiusM - radius);
}

function waistDistances(
  figure: Figure,
  weights: Float32Array,
  parts: readonly string[],
): Float32Array {
  const trunk = parts.indexOf('trunk');
  const distances = new Float32Array(figure.vertexCount);
  for (let v = 0; v < figure.vertexCount; v++) {
    let rest = 0;
    parts.forEach((_, p) => {
      if (p !== trunk) rest += weights[v * parts.length + p];
    });
    distances[v] = (weights[v * parts.length + trunk] - rest) * WAIST.transitionM;
  }
  return distances;
}

function shareOf(
  weights: Float32Array,
  parts: readonly string[],
  v: number,
  names: readonly string[],
): number {
  return names.reduce((sum, name) => sum + weights[v * parts.length + parts.indexOf(name)], 0);
}

export function runnerFields(
  figure: Figure,
  frame: RestFrame,
  rules: readonly PartRule[],
): RunnerFields {
  const parts = partsOf(rules);
  const weights = partWeights(figure, rules);
  const waist = waistDistances(figure, weights, parts);
  const marks = landmarks(frame);
  const distances = new Float32Array(figure.vertexCount * CHANNELS);
  const extents = new Float32Array(figure.vertexCount * CHANNELS);
  const extra = new Float32Array(figure.vertexCount * CHANNELS);
  const flush = skinFlush(figure, frame);
  const point = new Vector3();
  const scratch = new Vector3();
  for (let v = 0; v < figure.vertexCount; v++) {
    point.fromArray(figure.restPositions, v * AXES);
    const side = sideOf(point);
    const at = v * CHANNELS;
    const limbShare = shareOf(weights, parts, v, ['arm', 'head']);
    const armhole = -armholeInside(point);
    const hem = legHem(point, marks.thighs[side], scratch);
    distances[at] = waist[v];
    distances[at + 1] = armhole;
    distances[at + 2] = limbShare > SHORTS.maxLimbShare ? OUTSIDE : Math.min(-waist[v], hem);
    distances[at + 3] =
      SOCKS.topAboveAnkleM -
      along(point, marks.shins[side].origin, marks.shins[side].axis, scratch);
    const azimuth = azimuthOf(point, marks.head.centre);
    extents[at] = point.y - capHem(azimuth, marks.head);
    extents[at + 1] = point.y > marks.head.headY ? hair(point, marks.head) : OUTSIDE;
    extents[at + 3] = point.x;
    extra[at] = flush[v];
    extra[at + 1] = sidePanel(point);
    extra[at + 2] = hem;
    extra[at + 3] = -neckInside(point);
  }
  return { distances, extents, extra };
}
