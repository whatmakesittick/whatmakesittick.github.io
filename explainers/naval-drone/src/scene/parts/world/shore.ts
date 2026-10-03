import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  IcosahedronGeometry,
  Matrix4,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import type { MaterialFinish } from '@core/scene/materials';
import type { Placement } from '../../geometry/shoreScatter';
import { scatterRocks, scatterScrub } from '../../geometry/shoreScatter';
import type { TerrainGrid } from '../../geometry/shoreTerrain';
import { hash, shoreColour, terrainGrid } from '../../geometry/shoreTerrain';
import { instanced, mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';
import { noiseTexture } from '../surfaces';
import { createSlipway } from './shoreSlipway';
import { createStation, shaded } from './shoreStation';

export interface ShorePart {
  object: Group;
  stationAnchor: Object3D;
}

type Look = readonly [low: string, high: string, ...tones: string[]];

const GROUND_TILE = 4;
const GROUND_GRAIN = [256, 0.84, 1, 41] as const;
const BUSH_LOBES = [
  [0, 0.3, 0, 0.62],
  [0.5, 0.2, 0.25, 0.44],
] as const;
const BUSH_SQUASH = 0.6;
const BUSH_JITTER = 0.3;
const BUSH_SEED = 211;
const BUSH_LOOK: Look = ['#3a4129', '#7d8660', '#d8d3bb', '#b8b498', '#a7ad92'];
const ROCK_SQUASH = [1, 0.75, 0.85] as const;
const ROCK_JITTER = 0.2;
const ROCK_SEED = 241;
const ROCK_LOOK: Look = ['#25231f', '#6a665e', '#ffffff', '#d6d7d3', '#cbc2b2'];

const BUSH_FINISH: MaterialFinish = {
  color: '#ffffff',
  vertexColors: true,
  roughness: 0.95,
  envMapIntensity: 0.25,
};
const GROUND_FINISH = { ...BUSH_FINISH, envMapIntensity: 0.35 };
const ROCK_FINISH: MaterialFinish = { ...BUSH_FINISH, roughness: 0.9, flatShading: true };

const XYZ = 3;
const RGB = 3;
const UV = 2;
const JITTER_KEY = 7.3;
const HALF = 0.5;

function terrainGeometry({ xs, zs, heights }: TerrainGrid): BufferGeometry {
  const count = xs.length * zs.length;
  const positions = new Float32Array(count * XYZ);
  const colours = new Float32Array(count * RGB);
  const uvs = new Float32Array(count * UV);
  const colour = new Color();
  const indices: number[] = [];
  zs.forEach((z, row) =>
    xs.forEach((x, column) => {
      const index = row * xs.length + column;
      positions.set([x, heights[index], z], index * XYZ);
      shoreColour(x, z, colour).toArray(colours, index * RGB);
      uvs.set([x / GROUND_TILE, z / GROUND_TILE], index * UV);
      if (row > 0 && column > 0) {
        const corner = index - xs.length - 1;
        indices.push(corner, corner + xs.length, corner + 1, corner + 1, corner + xs.length, index);
      }
    }),
  );
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, XYZ));
  geometry.setAttribute('color', new BufferAttribute(colours, RGB));
  geometry.setAttribute('uv', new BufferAttribute(uvs, UV));
  geometry.setIndex(indices).computeVertexNormals();
  return geometry;
}

function lumpy(detail: number, amount: number, seed: number): BufferGeometry {
  const solid = new IcosahedronGeometry(1, detail);
  solid.deleteAttribute('normal');
  solid.deleteAttribute('uv');
  const geometry = mergeVertices(solid);
  const position = geometry.getAttribute('position');
  const point = new Vector3();
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index);
    const offset = hash(point.x * JITTER_KEY + point.z, point.y * JITTER_KEY, seed) - HALF;
    point.multiplyScalar(1 + (offset / HALF) * amount);
    position.setXYZ(index, point.x, point.y, point.z);
  }
  return geometry;
}

function scattered(
  context: PartContext,
  geometry: BufferGeometry,
  [low, high, ...tones]: Look,
  finish: MaterialFinish,
  placements: readonly Placement[],
): Object3D {
  const matrices = placements.map(({ x, y, z, scale, turn }) =>
    new Matrix4()
      .makeRotationY(turn)
      .scale(new Vector3(scale, scale, scale))
      .setPosition(x, y, z),
  );
  const mesh = instanced(context, shaded(geometry, low, high), UNDIMMED_GROUP, finish, matrices);
  const palette = tones.map((tone) => new Color(tone));
  placements.forEach(({ tone }, index) =>
    mesh.setColorAt(index, palette[Math.floor(tone * palette.length)]),
  );
  return mesh;
}

export function createShore(context: PartContext): ShorePart {
  const grid = terrainGrid();
  const grain = context.tracker.track(noiseTexture(...GROUND_GRAIN));
  const bush = mergeParts(
    BUSH_LOBES.map(([x, y, z, radius], index) =>
      lumpy(0, BUSH_JITTER, BUSH_SEED + index)
        .scale(radius, radius * BUSH_SQUASH, radius)
        .translate(x, y, z),
    ),
  );
  const rock = lumpy(1, ROCK_JITTER, ROCK_SEED).scale(...ROCK_SQUASH);
  const station = createStation(context, grain);
  const object = new Group();
  object.add(
    partMesh(context, terrainGeometry(grid), UNDIMMED_GROUP, { ...GROUND_FINISH, map: grain }),
    scattered(context, bush, BUSH_LOOK, BUSH_FINISH, scatterScrub()),
    scattered(context, rock, ROCK_LOOK, ROCK_FINISH, scatterRocks()),
    createSlipway(context),
    station.object,
    station.anchor,
  );
  return { object, stationAnchor: station.anchor };
}
