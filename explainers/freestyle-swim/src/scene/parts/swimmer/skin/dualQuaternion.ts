import type { Quaternion, Vector3 } from 'three';
import { INFLUENCES } from './types';

export const DUAL_STRIDE = 8;
const HALF = 0.5;
const DOUBLE = 2;

export function packRigid(bank: Float64Array, bone: number, q: Quaternion, t: Vector3): void {
  const at = bone * DUAL_STRIDE;
  bank[at] = q.x;
  bank[at + 1] = q.y;
  bank[at + 2] = q.z;
  bank[at + 3] = q.w;
  bank[at + 4] = HALF * (q.w * t.x + t.y * q.z - t.z * q.y);
  bank[at + 5] = HALF * (q.w * t.y + t.z * q.x - t.x * q.z);
  bank[at + 6] = HALF * (q.w * t.z + t.x * q.y - t.y * q.x);
  bank[at + 7] = -HALF * (t.x * q.x + t.y * q.y + t.z * q.z);
}

export function blendVertex(
  bank: Float64Array,
  joints: Uint8Array,
  weights: Float32Array,
  vertex: number,
  out: Float64Array,
): void {
  const first = vertex * INFLUENCES;
  const anchor = joints[first] * DUAL_STRIDE;
  const ax = bank[anchor];
  const ay = bank[anchor + 1];
  const az = bank[anchor + 2];
  const aw = bank[anchor + 3];
  let x = 0;
  let y = 0;
  let z = 0;
  let w = 0;
  let dx = 0;
  let dy = 0;
  let dz = 0;
  let dw = 0;
  for (let i = 0; i < INFLUENCES; i++) {
    const weight = weights[first + i];
    if (weight === 0) continue;
    const at = joints[first + i] * DUAL_STRIDE;
    const dot = bank[at] * ax + bank[at + 1] * ay + bank[at + 2] * az + bank[at + 3] * aw;
    const signed = dot < 0 ? -weight : weight;
    x += signed * bank[at];
    y += signed * bank[at + 1];
    z += signed * bank[at + 2];
    w += signed * bank[at + 3];
    dx += signed * bank[at + 4];
    dy += signed * bank[at + 5];
    dz += signed * bank[at + 6];
    dw += signed * bank[at + 7];
  }
  const inverse = 1 / (Math.sqrt(x * x + y * y + z * z + w * w) || 1);
  out[0] = x * inverse;
  out[1] = y * inverse;
  out[2] = z * inverse;
  out[3] = w * inverse;
  out[4] = dx * inverse;
  out[5] = dy * inverse;
  out[6] = dz * inverse;
  out[7] = dw * inverse;
}

export function translationOf(dq: Float64Array, offset: number, target: Vector3): Vector3 {
  const rx = dq[offset];
  const ry = dq[offset + 1];
  const rz = dq[offset + 2];
  const rw = dq[offset + 3];
  const dx = dq[offset + 4];
  const dy = dq[offset + 5];
  const dz = dq[offset + 6];
  const dw = dq[offset + 7];
  return target.set(
    DOUBLE * (rw * dx - dw * rx - (dy * rz - dz * ry)),
    DOUBLE * (rw * dy - dw * ry - (dz * rx - dx * rz)),
    DOUBLE * (rw * dz - dw * rz - (dx * ry - dy * rx)),
  );
}
