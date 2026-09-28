import { rowOffsetZ, PUMPS, PUMP_IDS } from '../../model/scale';
import type { Span } from '../../model/scale';
import { CROWD } from '../constants';
import type { CrowdForm } from '../constants';
import { between } from '../geometry/random';
import type { Random } from '../geometry/random';
import type { BeadPose } from './points';

const XYZ = 3;
const MAX_ROW = 9;
const TRIES_PER_BEAD = 40;
const PHASE_SPREAD = Math.PI * 2;
const Y_RATE = 0.7;
const Z_RATE = 0.85;

export interface Crowd {
  readonly count: number;
  readonly base: Float32Array;
  readonly phases: Float32Array;
}

function nearMotor(x: number, z: number): boolean {
  const row = Math.min(MAX_ROW, Math.max(0, Math.round(-z / -rowOffsetZ(1))));
  return Math.hypot(x, z - rowOffsetZ(row)) < CROWD.motorClearance;
}

function nearPump(x: number, z: number): boolean {
  return PUMP_IDS.some((id) => {
    const pump = PUMPS[id];
    return Math.hypot(x - pump.x, z) < pump.radius + CROWD.pumpClearance;
  });
}

export function isClear(x: number, z: number): boolean {
  return !nearMotor(x, z) && !nearPump(x, z);
}

function draw(random: Random, x: Span, z: Span): [number, number] {
  for (let attempt = 0; attempt < TRIES_PER_BEAD; attempt += 1) {
    const candidate: [number, number] = [between(random, ...x), between(random, ...z)];
    if (isClear(...candidate)) return candidate;
  }
  return [x[0], z[1]];
}

export function createCrowd(forms: readonly CrowdForm[], random: Random): Crowd {
  const count = forms.reduce((sum, form) => sum + form.count, 0);
  const base = new Float32Array(count * XYZ);
  const phases = new Float32Array(count * XYZ);
  let index = 0;
  forms.forEach((form) => {
    for (let bead = 0; bead < form.count; bead += 1, index += 1) {
      const [x, z] = draw(random, CROWD.x, CROWD.z);
      base.set([x, between(random, ...form.y), z], index * XYZ);
      phases.set(
        [0, 1, 2].map(() => random() * PHASE_SPREAD),
        index * XYZ,
      );
    }
  });
  return { count, base, phases };
}

export function poseCrowd(
  crowd: Crowd,
  index: number,
  clockDeg: number,
  calm: number,
  out: BeadPose,
): BeadPose {
  const offset = index * XYZ;
  const angle = clockDeg * CROWD.driftRadPerDeg;
  const sway = 1 - calm;
  const { drift } = CROWD;
  out.position.x = crowd.base[offset] + drift.x * sway * Math.sin(angle + crowd.phases[offset]);
  out.position.y =
    crowd.base[offset + 1] + drift.y * sway * Math.sin(angle * Y_RATE + crowd.phases[offset + 1]);
  out.position.z =
    crowd.base[offset + 2] + drift.z * sway * Math.sin(angle * Z_RATE + crowd.phases[offset + 2]);
  out.scale = 1;
  return out;
}
