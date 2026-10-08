import { BufferAttribute, BufferGeometry } from 'three';
import type { Color } from 'three';
import type { Projection } from './projection';
import { projectedUv } from './projection';

const XYZ = 3;
const UV = 2;
const RGBA = 4;

export interface TerrainAttributes {
  write(
    index: number,
    point: readonly [number, number, number],
    colour: Color,
    alpha: number,
  ): void;
  geometry(indices: number[]): BufferGeometry;
}

export function terrainAttributes(count: number, projection: Projection): TerrainAttributes {
  const positions = new Float32Array(count * XYZ);
  const uvs = new Float32Array(count * UV);
  const colours = new Float32Array(count * RGBA);
  return {
    write: (index, [x, y, z], colour, alpha) => {
      positions.set([x, y, z], index * XYZ);
      uvs.set(projectedUv(projection, x, z), index * UV);
      colour.toArray(colours, index * RGBA);
      colours[index * RGBA + RGBA - 1] = alpha;
    },
    geometry: (indices) => {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(positions, XYZ));
      geometry.setAttribute('uv', new BufferAttribute(uvs, UV));
      geometry.setAttribute('color', new BufferAttribute(colours, RGBA));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry;
    },
  };
}
