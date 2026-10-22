import type { BufferGeometry } from 'three';
import { merged } from '../geometry/merge';
import { MAST } from './constants';
import { farMast, nearMast } from './masts';
import { farSleepers, nearSleepers } from './sleepers';

function withMast(sleepers: BufferGeometry, mast: BufferGeometry): BufferGeometry {
  return merged([sleepers, mast.translate(MAST.phase, 0, 0)]);
}

export function nearRack(): BufferGeometry {
  return withMast(nearSleepers(), nearMast());
}

export function farRack(): BufferGeometry {
  return withMast(farSleepers(), farMast());
}
