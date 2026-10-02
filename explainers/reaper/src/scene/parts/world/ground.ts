import type { Mesh } from 'three';
import { BufferAttribute, BufferGeometry, Color } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { GROUND } from '../../constants';
import { sandFinish } from '../../finishes';
import { sandTexture } from '../../geometry/surfaceMaps';
import { gridLines, groundColour, terrainHeight } from '../../geometry/terrain';
import { partMesh } from '../context';
import type { PartContext } from '../context';

const XYZ = 3;
const RGB = 3;
const UV = 2;

export function groundGeometry(): BufferGeometry {
  const { extent, fine, cell, growth, textureTile } = GROUND;
  const xs = gridLines(extent.x, fine.x, cell, growth);
  const zs = gridLines(extent.z, fine.z, cell, growth);
  const count = xs.length * zs.length;
  const positions = new Float32Array(count * XYZ);
  const colours = new Float32Array(count * RGB);
  const uvs = new Float32Array(count * UV);
  const colour = new Color();
  zs.forEach((z, row) =>
    xs.forEach((x, column) => {
      const index = row * xs.length + column;
      const height = terrainHeight(x, z);
      positions.set([x, height, z], index * XYZ);
      groundColour(x, z, height, colour).toArray(colours, index * RGB);
      uvs.set([x / textureTile, z / textureTile], index * UV);
    }),
  );
  const indices: number[] = [];
  for (let row = 0; row < zs.length - 1; row += 1) {
    for (let column = 0; column < xs.length - 1; column += 1) {
      const a = row * xs.length + column;
      const b = a + xs.length;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, XYZ));
  geometry.setAttribute('color', new BufferAttribute(colours, RGB));
  geometry.setAttribute('uv', new BufferAttribute(uvs, UV));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createGround(context: PartContext): Mesh {
  const map = context.tracker.track(sandTexture(GROUND.sand));
  const ground = partMesh(context, groundGeometry(), UNDIMMED_GROUP, sandFinish(map));
  ground.frustumCulled = false;
  return ground;
}
