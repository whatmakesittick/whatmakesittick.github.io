import { ConeGeometry, CylinderGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { NOZZLE_PARTS } from '../../../ids';
import type { NozzleId } from '../../../ids';
import { BODY, drawnNozzleAt } from '../../parts/car/dimensions';
import { mergeParts } from '../../parts/context';
import { tinted } from './attributes';
import { latheAround } from './lathe';
import type { Profile } from './lathe';

const SEGMENTS = 18;

const COLLAR_PROFILE: Profile = [
  [0.02, -0.01],
  [0.035, -0.008],
  [0.035, 0.008],
  [0.02, 0.01],
];

const BELL_PROFILE: Profile = [
  [0.022, 0],
  [0.017, 0.022],
  [0.024, 0.055],
  [0.036, 0.09],
  [0.0405, 0.1],
  [0.038, 0.103],
  [0.034, 0.1],
  [0.022, 0.07],
  [0.009, 0.028],
  [0, 0.024],
];

export const BELL_LENGTH = 0.103;

const STEM = { radius: 0.026, segments: 14 } as const;

export const CONE = { radius: 0.055, length: 0.35, gap: 0.012, segments: 16 } as const;

const CORNER_EXIT_DROP = 0.03;
const FRONT_EXIT_SIDE_Z = 0.765;

export function nozzleReach(id: NozzleId): number {
  const [, y, z] = drawnNozzleAt(id);
  switch (NOZZLE_PARTS[id]) {
    case 'cornerNozzles':
      return y - BODY.floorY + CORNER_EXIT_DROP;
    case 'frontNozzles':
      return Math.max(BELL_LENGTH, FRONT_EXIT_SIDE_Z - Math.abs(z));
    default:
      return BELL_LENGTH;
  }
}

export interface NozzleTones {
  bell: string;
  collar: string;
}

function stemGeometry(length: number): BufferGeometry {
  const stem = new CylinderGeometry(STEM.radius, STEM.radius, length, STEM.segments, 1, true);
  stem.translate(0, length / 2, 0);
  return stem;
}

export function nozzleGeometry(reach: number, tones: NozzleTones): BufferGeometry {
  const lift = reach - BELL_LENGTH;
  const bell = latheAround(BELL_PROFILE, { axis: 'y', segments: SEGMENTS });
  const collar = latheAround(COLLAR_PROFILE, { axis: 'y', segments: SEGMENTS });
  bell.translate(0, lift, 0);
  collar.translate(0, lift, 0);
  const parts = [tinted(bell, tones.bell), tinted(collar, tones.collar)];
  if (lift > 0) parts.push(tinted(stemGeometry(lift), tones.bell));
  return mergeParts(parts);
}

export function coneGeometry(): BufferGeometry {
  const cone = new ConeGeometry(CONE.radius, CONE.length, CONE.segments);
  cone.translate(0, CONE.length / 2 + CONE.gap, 0);
  return cone;
}
