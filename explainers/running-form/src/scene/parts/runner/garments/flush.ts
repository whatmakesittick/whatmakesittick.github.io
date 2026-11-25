import { Vector3 } from 'three';
import type { Figure } from '@core/figure';
import type { RestFrame } from '@core/figure/body/restFrame';
import { clamp, smoothstep } from '@core/math';

const AXES = 3;

interface Spot {
  readonly at: Vector3;
  readonly radius: number;
  readonly strength: number;
}

const NOISE = { scale: 18, amount: 0.16, base: 0.12 } as const;
const KNEE_AHEAD_M = 0.045;
const ELBOW_BEHIND_M = 0.03;
const NOSE = { belowEyeM: 0.035, aheadM: 0.05 } as const;
const CHEEK = { belowEyeM: 0.03, sideM: 0.045, aheadM: 0.035 } as const;
const EAR = { sideM: 0.085, belowEyeM: 0.018, behindM: 0.02 } as const;

function spots(frame: RestFrame): Spot[] {
  const list: Spot[] = [];
  (['r', 'l'] as const).forEach((p) => {
    const sign = p === 'r' ? -1 : 1;
    const knee = frame.joint(`${p}_lowleg`);
    list.push({ at: knee.clone().setZ(knee.z + KNEE_AHEAD_M), radius: 0.045, strength: 0.55 });
    const elbow = frame.joint(`${p}_lowarm`);
    list.push({ at: elbow.clone().setZ(elbow.z - ELBOW_BEHIND_M), radius: 0.04, strength: 0.45 });
    ['index1', 'middle1', 'ring1', 'pinky1', 'index2', 'middle2', 'ring2'].forEach((joint) =>
      list.push({ at: frame.joint(`${p}_${joint}`), radius: 0.022, strength: 0.4 }),
    );
    const eye = frame.joint(`${p}_eye`);
    list.push({
      at: new Vector3(sign * CHEEK.sideM, eye.y - CHEEK.belowEyeM, eye.z - CHEEK.aheadM / 2),
      radius: 0.03,
      strength: 0.32,
    });
    list.push({
      at: new Vector3(
        sign * EAR.sideM,
        eye.y - EAR.belowEyeM,
        frame.joint('c_head').z - EAR.behindM,
      ),
      radius: 0.03,
      strength: 0.5,
    });
  });
  const eye = frame.joint('r_eye');
  list.push({
    at: new Vector3(0, eye.y - NOSE.belowEyeM, eye.z + NOSE.aheadM),
    radius: 0.025,
    strength: 0.4,
  });
  return list;
}

function hash(x: number, y: number, z: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(point: Vector3): number {
  const x = point.x * NOISE.scale;
  const y = point.y * NOISE.scale;
  const z = point.z * NOISE.scale;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const sx = smoothstep(fx);
  const sy = smoothstep(fy);
  const sz = smoothstep(fz);
  let total = 0;
  for (let corner = 0; corner < 8; corner++) {
    const dx = corner & 1;
    const dy = (corner >> 1) & 1;
    const dz = (corner >> 2) & 1;
    const weight = (dx ? sx : 1 - sx) * (dy ? sy : 1 - sy) * (dz ? sz : 1 - sz);
    total += weight * hash(ix + dx, iy + dy, iz + dz);
  }
  return total;
}

export function skinFlush(figure: Figure, frame: RestFrame): Float32Array {
  const list = spots(frame);
  const flush = new Float32Array(figure.vertexCount);
  const point = new Vector3();
  for (let v = 0; v < figure.vertexCount; v++) {
    point.fromArray(figure.restPositions, v * AXES);
    let sum = NOISE.base + NOISE.amount * (valueNoise(point) - 0.5);
    list.forEach(({ at, radius, strength }) => {
      sum += strength * Math.exp(-point.distanceToSquared(at) / (radius * radius));
    });
    flush[v] = clamp(sum, 0, 1);
  }
  return flush;
}
