import type { BufferGeometry } from 'three';
import { bare } from '../geometry/merge';
import { bodySection, bodyStations } from './bodyShape';
import { LOFT } from './constants';
import { loft } from './loft';
import { halfRing } from './section';

export function trainBody(): BufferGeometry {
  return bare(loft(bodyStations(), (x) => halfRing(bodySection(x), LOFT.ring)));
}
