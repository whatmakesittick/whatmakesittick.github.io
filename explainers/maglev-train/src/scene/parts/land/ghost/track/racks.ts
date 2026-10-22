import type { BufferGeometry } from 'three';
import { mergeParts } from '../../../line/geometry';
import { MAST } from './constants';
import { farMast, nearMast } from './masts';
import { farSleepers, nearSleepers } from './sleepers';

function withMast(sleepers: BufferGeometry, mast: BufferGeometry): BufferGeometry {
  return mergeParts([sleepers, mast.translate(MAST.phase, 0, 0)]);
}

export function nearRack(): BufferGeometry {
  return withMast(nearSleepers(), nearMast());
}

export function farRack(): BufferGeometry {
  return withMast(farSleepers(), farMast());
}
