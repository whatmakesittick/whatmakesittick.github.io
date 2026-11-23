import { Vector3 } from 'three';
import type { Figure } from '@core/figure';
import { along, axisBetween } from '@core/figure/body/hems';
import type { RestFrame } from '@core/figure/body/restFrame';
import { clamp, smoothstep } from '@core/math';
import { CHANNELS } from './fields';
import type { RunnerFields } from './fields';

export const CLOTH_CHANNELS = 3;

export const CLOTH = {
  edgeM: 0.004,
  singletM: 0.0032,
  shortsM: 0.0026,
  hemFlareM: 0.019,
  hemFlareReachM: 0.11,
  medialFlareShare: 0.35,
  sockM: 0.0012,
  hairM: 0.0012,
  capM: 0.0045,
  crownM: 0.0055,
  crownFromM: 0.02,
  crownToM: 0.095,
} as const;

const AXES = 3;
const CHANNEL = { waist: 0, armhole: 1, shorts: 2, sock: 3 } as const;
const EXTENT = { cap: 0, hair: 1 } as const;
const EXTRA = { hem: 2, neck: 3 } as const;

interface Thigh {
  readonly origin: Vector3;
  readonly axis: Vector3;
  readonly lateral: Vector3;
}

function thigh(frame: RestFrame, prefix: 'r' | 'l', lateralX: number): Thigh {
  const axis = axisBetween(frame, `${prefix}_upleg`, `${prefix}_lowleg`);
  const lateral = new Vector3(lateralX, 0, 0).addScaledVector(axis, -lateralX * axis.x).normalize();
  return { origin: frame.joint(`${prefix}_upleg`), axis, lateral };
}

function lateralShare(point: Vector3, limb: Thigh, scratch: Vector3): number {
  const reach = along(point, limb.origin, limb.axis, scratch);
  const radial = scratch
    .copy(point)
    .sub(limb.origin)
    .addScaledVector(limb.axis, -reach)
    .normalize();
  return clamp(radial.dot(limb.lateral) * 0.5 + 0.5, 0, 1);
}

function cover(gap: number): number {
  return smoothstep(gap, -CLOTH.edgeM * 0.25, CLOTH.edgeM);
}

function shortsLift(gap: number, hem: number, lateral: number): number {
  const flare = CLOTH.hemFlareM * (1 - smoothstep(hem, 0, CLOTH.hemFlareReachM));
  const share = CLOTH.medialFlareShare + (1 - CLOTH.medialFlareShare) * lateral;
  return cover(gap) * (CLOTH.shortsM + flare * share);
}

function capLift(gap: number): number {
  return (
    cover(gap) * (CLOTH.capM + CLOTH.crownM * smoothstep(gap, CLOTH.crownFromM, CLOTH.crownToM))
  );
}

export function clothField(figure: Figure, frame: RestFrame, fields: RunnerFields): Float32Array {
  const { distances, extents, extra } = fields;
  const thighs = { right: thigh(frame, 'r', -1), left: thigh(frame, 'l', 1) };
  const head = frame.joint('c_head');
  const cloth = new Float32Array(figure.vertexCount * CLOTH_CHANNELS);
  const point = new Vector3();
  const scratch = new Vector3();
  for (let v = 0; v < figure.vertexCount; v++) {
    point.fromArray(figure.restPositions, v * AXES);
    const at = v * CHANNELS;
    const singlet = Math.min(
      distances[at + CHANNEL.waist],
      distances[at + CHANNEL.armhole],
      extra[at + EXTRA.neck],
    );
    const limb = point.x < 0 ? thighs.right : thighs.left;
    const lift = Math.max(
      cover(singlet) * CLOTH.singletM,
      shortsLift(
        distances[at + CHANNEL.shorts],
        extra[at + EXTRA.hem],
        lateralShare(point, limb, scratch),
      ),
      cover(distances[at + CHANNEL.sock]) * CLOTH.sockM,
      cover(extents[at + EXTENT.hair]) * CLOTH.hairM,
      capLift(extents[at + EXTENT.cap]),
    );
    const azimuth = Math.atan2(point.x - head.x, point.z - head.z);
    cloth[v * CLOTH_CHANNELS] = lift;
    cloth[v * CLOTH_CHANNELS + 1] = Math.sin(azimuth);
    cloth[v * CLOTH_CHANNELS + 2] = Math.cos(azimuth);
  }
  return cloth;
}
