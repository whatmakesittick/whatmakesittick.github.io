import { BufferAttribute, BufferGeometry, Color, Vector2 } from 'three';
import type { Mesh, Texture } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import type { MaterialFinish } from '@core/scene/materials';
import type { TerrainGrid } from '../../geometry/shoreGrid';
import { gridHeight } from '../../geometry/shoreGrid';
import { centredNoise } from '../../geometry/shoreNoise';
import type { TrackSample } from '../../geometry/shoreTerrain';
import { SHORE_COLOURS, shoreColour, trackLine } from '../../geometry/shoreTerrain';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';

export const GROUND_SHAPE = {
  tile: 4,
  finish: { roughness: 0.96, metalness: 0, envMapIntensity: 0.35 },
  ribbon: {
    across: [-2.1, -1.4, -0.8, 0, 0.8, 1.4, 2.1] as const,
    lift: [0.015, 0.05, 0.05, 0.05, 0.05, 0.05, 0.015] as const,
    gravel: [0, 1, 1, 1, 1, 1, 0] as const,
    ruts: [0, 0, 1, 0, 1, 0, 0] as const,
    tint: SHORE_COLOURS.gravel,
    rutTint: '#6f695d',
    mottleTint: '#9a917f',
    mottleScale: 3,
    mottleShare: 0.5,
    rutShare: 0.55,
    seed: 37,
  },
} as const;

const XYZ = 3;
const RGB = 3;
const UV = 2;

function gridIndices(columns: number, rows: number): number[] {
  const indices: number[] = [];
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + columns;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return indices;
}

function surface(
  positions: Float32Array,
  colours: Float32Array,
  uvs: Float32Array,
  indices: number[],
): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, XYZ));
  geometry.setAttribute('color', new BufferAttribute(colours, RGB));
  geometry.setAttribute('uv', new BufferAttribute(uvs, UV));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function terrainGeometry(grid: TerrainGrid): BufferGeometry {
  const { xs, zs, heights } = grid;
  const count = xs.length * zs.length;
  const positions = new Float32Array(count * XYZ);
  const colours = new Float32Array(count * RGB);
  const uvs = new Float32Array(count * UV);
  const colour = new Color();
  zs.forEach((z, row) =>
    xs.forEach((x, column) => {
      const index = row * xs.length + column;
      positions.set([x, heights[index], z], index * XYZ);
      shoreColour(x, z, colour).toArray(colours, index * RGB);
      uvs.set([x / GROUND_SHAPE.tile, z / GROUND_SHAPE.tile], index * UV);
    }),
  );
  return surface(positions, colours, uvs, gridIndices(xs.length, zs.length));
}

function sideways(line: readonly TrackSample[], index: number): Vector2 {
  const before = line[Math.max(0, index - 1)];
  const after = line[Math.min(line.length - 1, index + 1)];
  return new Vector2(after.z - before.z, before.x - after.x).normalize();
}

const GRAVEL = {
  tint: new Color(GROUND_SHAPE.ribbon.tint),
  rut: new Color(GROUND_SHAPE.ribbon.rutTint),
  mottle: new Color(GROUND_SHAPE.ribbon.mottleTint),
} as const;
const NOISE_OFFSET = 0.5;

function gravelColour(x: number, z: number, column: number, target: Color): Color {
  const { gravel, ruts, mottleScale, mottleShare, rutShare, seed } = GROUND_SHAPE.ribbon;
  const ground = shoreColour(x, z, new Color());
  const mottle = centredNoise(x / mottleScale, z / mottleScale, seed) + NOISE_OFFSET;
  const surface = GRAVEL.tint.clone().lerp(GRAVEL.mottle, mottle * mottleShare);
  surface.lerp(GRAVEL.rut, ruts[column] * rutShare);
  return target.copy(ground).lerp(surface, gravel[column]);
}

export function trackRibbon(grid: TerrainGrid): BufferGeometry {
  const { across, lift } = GROUND_SHAPE.ribbon;
  const line = trackLine();
  const count = line.length * across.length;
  const positions = new Float32Array(count * XYZ);
  const colours = new Float32Array(count * RGB);
  const uvs = new Float32Array(count * UV);
  const colour = new Color();
  line.forEach((sample, row) => {
    const side = sideways(line, row);
    across.forEach((offset, column) => {
      const index = row * across.length + column;
      const x = sample.x + side.x * offset;
      const z = sample.z + side.y * offset;
      positions.set([x, gridHeight(grid, x, z) + lift[column], z], index * XYZ);
      gravelColour(x, z, column, colour).toArray(colours, index * RGB);
      uvs.set([x / GROUND_SHAPE.tile, z / GROUND_SHAPE.tile], index * UV);
    });
  });
  return surface(positions, colours, uvs, gridIndices(across.length, line.length));
}

export function createGround(context: PartContext, grid: TerrainGrid, grain: Texture): Mesh {
  const finish: MaterialFinish = {
    color: '#ffffff',
    map: grain,
    vertexColors: true,
    ...GROUND_SHAPE.finish,
  };
  const geometry = mergeParts([terrainGeometry(grid), trackRibbon(grid)]);
  const mesh = partMesh(context, geometry, UNDIMMED_GROUP, finish);
  mesh.name = 'shoreGround';
  return mesh;
}
