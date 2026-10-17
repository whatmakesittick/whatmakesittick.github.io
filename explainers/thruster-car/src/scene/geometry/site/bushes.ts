import { Color, Float32BufferAttribute, IcosahedronGeometry, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { lerp, smoothstep } from '@core/math';
import { SITE } from '../../../model/layout';
import { LIGHT_RIG } from '../../constants';
import { mergeParts } from '../../parts/context';
import { GROUND } from './groundGrid';
import { fractalNoise, hash2 } from './noise';
import { onTrack } from './tracks';

export interface Bush {
  x: number;
  z: number;
  size: number;
  tone: number;
  seed: number;
}

export const BUSHES = {
  count: 64,
  area: { x: [-70, 170], z: [-80, 80] },
  keepOut: { x: 8, z: 5 },
  size: [0.45, 1.25],
  blobs: [2, 4],
  blobScale: [0.55, 1],
  spread: 0.6,
  shadeReach: 2,
  squash: 0.68,
  lumps: { scale: 3.2, depth: 0.5 },
  detail: 1,
  sink: 0.3,
  shadow: 0.4,
  warmTop: { colour: '#8f7c4b', share: 0.32 },
  tones: ['#3e4128', '#4f4329', '#3a4530', '#4a3c26'],
  seed: 61,
} as const;

const RGB = 3;
const CANDIDATES_PER_BUSH = 4;
const LUMP_OCTAVES = 2;
const SEEDS = { x: 0, z: 1, size: 2, tone: 3, blobs: 4, offset: 5 } as const;
const BLOB_SEED_STRIDE = 7;
const SUN = new Vector3(...LIGHT_RIG.key.direction).normalize();
const WARM_TOP = new Color(BUSHES.warmTop.colour);

export function nearRun(x: number, z: number): boolean {
  const { x: runX, z: runZ } = SITE.run;
  const { keepOut } = BUSHES;
  return (
    x > runX[0] - keepOut.x &&
    x < runX[1] + keepOut.x &&
    z > runZ[0] - keepOut.z &&
    z < runZ[1] + keepOut.z
  );
}

export function scatterBushes(): Bush[] {
  const { count, area, size, seed } = BUSHES;
  const bushes: Bush[] = [];
  for (let index = 0; index < count * CANDIDATES_PER_BUSH && bushes.length < count; index += 1) {
    const x = lerp(area.x[0], area.x[1], hash2(index, seed + SEEDS.x));
    const z = lerp(area.z[0], area.z[1], hash2(index, seed + SEEDS.z));
    if (nearRun(x, z) || onTrack(x, z, BUSHES.size[1])) continue;
    bushes.push({
      x,
      z,
      size: lerp(size[0], size[1], hash2(index, seed + SEEDS.size)),
      tone: hash2(index, seed + SEEDS.tone),
      seed: index,
    });
  }
  return bushes;
}

function lumpy(geometry: BufferGeometry, seed: number): void {
  const { scale, depth } = BUSHES.lumps;
  const position = geometry.getAttribute('position');
  const point = new Vector3();
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index);
    const lump = fractalNoise(
      point.x * scale + seed,
      point.z * scale + point.y,
      LUMP_OCTAVES,
      seed,
    );
    point.multiplyScalar(1 + depth * (lump - 0.5));
    position.setXYZ(index, point.x, point.y, point.z);
  }
}

function shaded(geometry: BufferGeometry, tone: Color, height: number): void {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const facing = new Vector3();
  const colours: number[] = [];
  const colour = new Color();
  for (let index = 0; index < position.count; index += 1) {
    const lift = smoothstep(position.getY(index) - GROUND.level, 0, height);
    const sunlit = Math.max(facing.fromBufferAttribute(normal, index).dot(SUN), 0) * lift;
    colour.copy(tone).multiplyScalar(lerp(BUSHES.shadow, 1, lift));
    colour.lerp(WARM_TOP, BUSHES.warmTop.share * sunlit);
    colours.push(colour.r, colour.g, colour.b);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colours, RGB));
}

function blob(bush: Bush, index: number, template: BufferGeometry): BufferGeometry {
  const seed = bush.seed * BLOB_SEED_STRIDE + index;
  const radius = bush.size * lerp(...BUSHES.blobScale, hash2(seed, BUSHES.seed + SEEDS.size));
  const angle = hash2(seed, BUSHES.seed + SEEDS.offset) * Math.PI * 2;
  const reach = index === 0 ? 0 : bush.size * BUSHES.spread;
  const geometry = template.clone();
  lumpy(geometry, seed);
  geometry.scale(radius, radius * BUSHES.squash, radius);
  geometry.translate(
    bush.x + Math.cos(angle) * reach,
    GROUND.level + radius * BUSHES.squash * (1 - BUSHES.sink),
    bush.z + Math.sin(angle) * reach,
  );
  return geometry;
}

function blobTemplate(): BufferGeometry {
  const sphere = new IcosahedronGeometry(1, BUSHES.detail);
  sphere.deleteAttribute('uv');
  sphere.deleteAttribute('normal');
  const welded = mergeVertices(sphere);
  sphere.dispose();
  return welded;
}

function bushGeometry(bush: Bush, template: BufferGeometry): BufferGeometry {
  const { blobs, tones } = BUSHES;
  const count = Math.round(lerp(blobs[0], blobs[1], hash2(bush.seed, BUSHES.seed + SEEDS.blobs)));
  const tone = new Color(tones[Math.floor(bush.tone * tones.length)]);
  const geometry = mergeParts(
    Array.from({ length: count }, (_, index) => blob(bush, index, template)),
  );
  geometry.computeVertexNormals();
  shaded(geometry, tone, bush.size * BUSHES.squash * BUSHES.shadeReach);
  return geometry;
}

export function bushesGeometry(bushes: readonly Bush[]): BufferGeometry {
  const template = blobTemplate();
  const geometry = mergeParts(bushes.map((bush) => bushGeometry(bush, template)));
  template.dispose();
  return geometry;
}
