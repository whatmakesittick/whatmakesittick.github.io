import { ConeGeometry, CylinderGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { CORNER_NOZZLE_IDS } from '../../../ids';
import type { NozzleId } from '../../../ids';
import { BODY, drawnNozzleAt } from '../../parts/car/dimensions';
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

const STEM = { radius: 0.016, segments: 10 } as const;

export const CONE = { radius: 0.055, length: 0.35, gap: 0.012, segments: 16 } as const;

const CORNER_EXIT_DROP = 0.03;

const CORNER_IDS: ReadonlySet<NozzleId> = new Set(CORNER_NOZZLE_IDS);

export function nozzleReach(id: NozzleId): number {
  if (!CORNER_IDS.has(id)) return BELL_LENGTH;
  return drawnNozzleAt(id)[1] - BODY.floorY + CORNER_EXIT_DROP;
}

export function bellGeometry(): BufferGeometry {
  return latheAround(BELL_PROFILE, { axis: 'y', segments: SEGMENTS });
}

export function collarGeometry(): BufferGeometry {
  return latheAround(COLLAR_PROFILE, { axis: 'y', segments: SEGMENTS });
}

export function stemGeometry(): BufferGeometry {
  const stem = new CylinderGeometry(STEM.radius, STEM.radius, 1, STEM.segments, 1, true);
  stem.translate(0, 1 / 2, 0);
  return stem;
}

export function coneGeometry(): BufferGeometry {
  const cone = new ConeGeometry(CONE.radius, CONE.length, CONE.segments);
  cone.translate(0, CONE.length / 2 + CONE.gap, 0);
  return cone;
}
