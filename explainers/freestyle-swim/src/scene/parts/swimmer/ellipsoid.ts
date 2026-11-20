import { SphereGeometry } from 'three';
import type { BufferGeometry } from 'three';

const DEFAULT_SEGMENTS = { width: 16, height: 12 };

export function ellipsoid(
  radii: readonly number[],
  centre: readonly number[],
  segments = DEFAULT_SEGMENTS,
): BufferGeometry {
  const sphere = new SphereGeometry(1, segments.width, segments.height)
    .scale(radii[0], radii[1], radii[2])
    .translate(centre[0], centre[1], centre[2]);
  sphere.deleteAttribute('uv');
  return sphere;
}
