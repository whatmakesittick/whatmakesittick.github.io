import type { BufferGeometry } from 'three';
import { bodySection, bodyStations } from './bodyShape';
import { LOFT } from './constants';
import { loft } from './loft';
import { halfRing } from './section';

export function trainBody(): BufferGeometry {
  return loft(bodyStations(), (x) => halfRing(bodySection(x), LOFT.ring));
}
