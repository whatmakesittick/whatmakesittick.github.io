import { RingGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { HALF_TURN, QUARTER_TURN } from '../../turns';

export function backHalfRing(
  inner: number,
  outer: number,
  height: number,
  segments: number,
): BufferGeometry {
  const geometry = new RingGeometry(inner, outer, segments, 1, QUARTER_TURN, HALF_TURN);
  geometry.rotateX(-QUARTER_TURN);
  geometry.translate(0, height, 0);
  return geometry;
}
