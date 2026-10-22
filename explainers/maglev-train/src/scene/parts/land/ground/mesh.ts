import { BufferGeometry, Float32BufferAttribute } from 'three';
import { GROUND } from '../constants';
import type { AxisWarp } from './warp';

const CORNERS_PER_ROW = 2;

export function groundGeometry(warp: AxisWarp): BufferGeometry {
  const { reach, period, rows } = GROUND;
  const xs = [-reach, reach + period];
  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];
  for (let row = 0; row <= rows; row += 1) {
    const share = row / rows;
    const z = warp.value(share);
    xs.forEach((x) => {
      positions.push(x, 0, z);
      uvs.push(x / period, share);
      normals.push(0, 1, 0);
    });
  }
  const indices: number[] = [];
  for (let row = 0; row < rows; row += 1) {
    const a = row * CORNERS_PER_ROW;
    indices.push(
      a,
      a + CORNERS_PER_ROW,
      a + 1,
      a + 1,
      a + CORNERS_PER_ROW,
      a + CORNERS_PER_ROW + 1,
    );
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}
