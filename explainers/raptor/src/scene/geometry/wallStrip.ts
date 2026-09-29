import { BufferGeometry, Float32BufferAttribute } from 'three';
import { wallRadius } from '../../model';

const XYZ = 3;

export interface StripSpec {
  inner: number;
  outer: number;
  from: number;
  to: number;
  samples: number;
  z: number;
}

export function wallStrip(spec: StripSpec): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const rows = spec.samples + 1;
  for (const side of [1, -1]) {
    const base = positions.length / XYZ;
    for (let index = 0; index <= spec.samples; index += 1) {
      const y = spec.from + ((spec.to - spec.from) * index) / spec.samples;
      const radius = wallRadius(y);
      for (const offset of [spec.inner, spec.outer]) {
        positions.push(side * (radius + offset), y, spec.z);
        normals.push(0, 0, 1);
        uvs.push(offset, index / spec.samples);
      }
    }
    for (let index = 0; index < rows - 1; index += 1) {
      const a = base + index * 2;
      const flipped = side > 0 === spec.to < spec.from;
      indices.push(
        ...(flipped
          ? [a, a + 2, a + 1, a + 1, a + 2, a + 3]
          : [a, a + 1, a + 2, a + 1, a + 3, a + 2]),
      );
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, XYZ));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, XYZ));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}
