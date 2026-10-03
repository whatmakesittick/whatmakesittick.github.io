import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  IcosahedronGeometry,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three';
import type { InstancedMesh } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import type { MaterialFinish } from '@core/scene/materials';
import type { TerrainGrid } from '../../geometry/shoreGrid';
import { signedHash } from '../../geometry/shoreNoise';
import type { Placement } from '../../geometry/shoreScatter';
import { scatterRocks, scatterScrub, scatterTufts } from '../../geometry/shoreScatter';
import { grassTexture } from './shoreMaps';
import { instanced, mergeParts } from '../context';
import type { PartContext } from '../context';

type Tones = readonly string[];
type Shade = readonly [low: string, high: string];

interface Lobe {
  at: readonly [x: number, y: number, z: number];
  radius: number;
}

export const COVER_SHAPE = {
  bush: {
    lobes: [
      { at: [0, 0.3, 0], radius: 0.62 },
      { at: [0.5, 0.2, 0.25], radius: 0.44 },
    ] as readonly Lobe[],
    squash: 0.6,
    jitter: 0.3,
    seed: 211,
    shade: ['#3a4129', '#7d8660'] as Shade,
    tones: ['#d8d3bb', '#c3c9ad', '#b8b498', '#a7ad92', '#cec3a2'] as Tones,
    finish: {
      color: '#ffffff',
      vertexColors: true,
      roughness: 0.95,
      metalness: 0,
      envMapIntensity: 0.25,
    },
  },
  grass: {
    cards: 3,
    width: 1.1,
    height: 0.62,
    shade: ['#a3a285', '#ffffff'] as Shade,
    tones: ['#ffffff', '#e8e2cf', '#d9dcc3', '#f2ead6', '#c9c6ad'] as Tones,
    finish: {
      color: '#ffffff',
      vertexColors: true,
      roughness: 0.95,
      metalness: 0,
      alphaTest: 0.45,
      side: DoubleSide,
      envMapIntensity: 0.25,
    },
  },
  rock: {
    detail: 1,
    squash: [1, 0.75, 0.85] as const,
    jitter: 0.2,
    seed: 241,
    shade: ['#25231f', '#6a665e'] as Shade,
    tones: ['#ffffff', '#e8e2d8', '#d6d7d3', '#cbc2b2'] as Tones,
    finish: {
      color: '#ffffff',
      vertexColors: true,
      roughness: 0.9,
      metalness: 0,
      flatShading: true,
      envMapIntensity: 0.35,
    },
  },
} as const;

const RGB = 3;
const XYZ = 3;
const UP = new Vector3(0, 1, 0);
const JITTER_KEY = 7.3;
const UV = 2;
const CARD_UV = [0, 1, 1, 1, 1, 0, 0, 0];
const CARD_INDEX = [0, 1, 2, 0, 2, 3];
const CARD_NORMALS = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];

function shadeByHeight(geometry: BufferGeometry, shade: Shade): BufferGeometry {
  geometry.computeBoundingBox();
  const bottom = geometry.boundingBox?.min.y ?? 0;
  const span = Math.max((geometry.boundingBox?.max.y ?? 1) - bottom, Number.EPSILON);
  const position = geometry.getAttribute('position');
  const colours = new Float32Array(position.count * RGB);
  const [low, high] = shade.map((value) => new Color(value));
  const colour = new Color();
  for (let index = 0; index < position.count; index += 1) {
    colour.copy(low).lerp(high, (position.getY(index) - bottom) / span);
    colour.toArray(colours, index * RGB);
  }
  geometry.setAttribute('color', new BufferAttribute(colours, RGB));
  return geometry;
}

function jitter(geometry: BufferGeometry, amount: number, seed: number): BufferGeometry {
  const position = geometry.getAttribute('position');
  const point = new Vector3();
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index);
    const offset = signedHash(point.x * JITTER_KEY + point.z, point.y * JITTER_KEY, seed);
    point.multiplyScalar(1 + offset * amount);
    position.setXYZ(index, point.x, point.y, point.z);
  }
  return geometry;
}

function blob(detail = 0): BufferGeometry {
  const geometry = new IcosahedronGeometry(1, detail);
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  return mergeVertices(geometry);
}

function bushGeometry(): BufferGeometry {
  const { lobes, squash, jitter: amount, seed, shade } = COVER_SHAPE.bush;
  const parts = lobes.map(({ at, radius }, index) => {
    const lobe = jitter(blob(), amount, seed + index);
    lobe.scale(radius, radius * squash, radius).translate(at[0], at[1], at[2]);
    lobe.computeVertexNormals();
    return lobe;
  });
  return shadeByHeight(mergeParts(parts), shade);
}

function grassCard(turn: number): BufferGeometry {
  const { width, height } = COVER_SHAPE.grass;
  const half = width / 2;
  const positions = [-half, 0, 0, half, 0, 0, half, height, 0, -half, height, 0];
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), XYZ));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(CARD_UV), UV));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(CARD_NORMALS), XYZ));
  geometry.setIndex(CARD_INDEX);
  return geometry.rotateY(turn);
}

function grassGeometry(): BufferGeometry {
  const { cards, shade } = COVER_SHAPE.grass;
  const parts = Array.from({ length: cards }, (_, card) => grassCard((card * Math.PI) / cards));
  return shadeByHeight(mergeParts(parts), shade);
}

function rockGeometry(): BufferGeometry {
  const { detail, squash, jitter: amount, seed, shade } = COVER_SHAPE.rock;
  const geometry = jitter(blob(detail), amount, seed);
  geometry.scale(...squash);
  geometry.computeVertexNormals();
  return shadeByHeight(geometry, shade);
}

function matrices(placements: readonly Placement[]): Matrix4[] {
  const turn = new Quaternion();
  const scale = new Vector3();
  return placements.map((placement) => {
    turn.setFromAxisAngle(UP, placement.turn);
    const { scale: size, stretch } = placement;
    scale.set(size * stretch, size, size / stretch);
    return new Matrix4().compose(new Vector3(placement.x, placement.y, placement.z), turn, scale);
  });
}

function scattered(
  context: PartContext,
  geometry: BufferGeometry,
  finish: MaterialFinish,
  placements: readonly Placement[],
  tones: Tones,
): InstancedMesh {
  const mesh = instanced(context, geometry, UNDIMMED_GROUP, finish, matrices(placements));
  const palette = tones.map((tone) => new Color(tone));
  placements.forEach((placement, index) =>
    mesh.setColorAt(index, palette[Math.floor(placement.tone * palette.length)]),
  );
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

export function createGroundCover(context: PartContext, grid: TerrainGrid): InstancedMesh[] {
  const { bush, grass, rock } = COVER_SHAPE;
  const grassFinish = { ...grass.finish, map: context.tracker.track(grassTexture()) };
  const scrub = scattered(context, bushGeometry(), bush.finish, scatterScrub(grid), bush.tones);
  const tufts = scattered(context, grassGeometry(), grassFinish, scatterTufts(grid), grass.tones);
  const rocks = scattered(context, rockGeometry(), rock.finish, scatterRocks(grid), rock.tones);
  scrub.name = 'shoreScrub';
  tufts.name = 'shoreTufts';
  rocks.name = 'shoreRocks';
  return [scrub, tufts, rocks];
}
