import type { Group, Object3D } from 'three';
import type { ProfilePoint } from '@core/scene/geometry/lathe';
import { namedGroup, partMesh } from '../../context';
import type { PartContext } from '../../context';
import { AXIS_Y, SEGMENTS } from './constants';
import { boltRing, merge, turned } from './geometry';

const SHAFT_PROFILE: readonly ProfilePoint[] = [
  [-4.4, 0],
  [-4.4, 0.95],
  [-4.26, 0.95],
  [-4.26, 0.74],
  [-4.12, 0.6],
  [-3.0, 0.6],
  [-1.6, 0.56],
  [-1.0, 0.56],
  [-1.0, 0],
];

const SHRINK_DISC_PROFILE: readonly ProfilePoint[] = [
  [-1.4, 0.56],
  [-1.4, 0.82],
  [-1.36, 0.86],
  [-1.24, 0.86],
  [-1.24, 0.78],
  [-1.2, 0.78],
  [-1.2, 0.86],
  [-1.1, 0.86],
  [-1.06, 0.82],
  [-1.06, 0.56],
];

const FLANGE_BOLTS = {
  count: 20,
  radius: 0.85,
  x: -4.26,
  side: 1,
  head: 0.035,
  length: 0.06,
} as const;
const DISC_BOLTS = {
  count: 16,
  radius: 0.72,
  x: -1.4,
  side: -1,
  head: 0.03,
  length: 0.05,
} as const;

export function buildMainShaft(context: PartContext, parent: Object3D): Group {
  const spin = namedGroup('mainShaftSpin', parent);
  spin.position.y = AXIS_Y;
  const geometry = merge([
    turned(SHAFT_PROFILE, SEGMENTS.large),
    turned(SHRINK_DISC_PROFILE, SEGMENTS.large),
    ...boltRing(FLANGE_BOLTS),
    ...boltRing(DISC_BOLTS),
  ]);
  spin.add(partMesh(context, geometry, 'mainShaft'));
  return spin;
}
