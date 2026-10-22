import { BufferGeometry, Float32BufferAttribute } from 'three';
import { mirrored } from '../../../lineUp/profile';
import type { SectionPoint } from './section';

const XYZ = 3;

function bandIndices(stations: number, width: number): number[] {
  const indices: number[] = [];
  for (let station = 0; station < stations - 1; station += 1) {
    for (let around = 0; around < width; around += 1) {
      const a = station * width + around;
      const b = station * width + ((around + 1) % width);
      indices.push(a, b, a + width, b, b + width, a + width);
    }
  }
  return indices;
}

export function loft(
  stations: readonly number[],
  ringAt: (x: number) => readonly SectionPoint[],
): BufferGeometry {
  const rings = stations.map((x) => mirrored(ringAt(x)));
  const positions = rings.flatMap((ring, index) =>
    ring.flatMap(([z, y]) => [stations[index], y, z]),
  );
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, XYZ));
  geometry.setIndex(bandIndices(stations.length, rings[0].length));
  geometry.computeVertexNormals();
  return geometry;
}
