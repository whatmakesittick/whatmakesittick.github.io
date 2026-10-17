import { Color, Float32BufferAttribute, IcosahedronGeometry, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { lerp, smoothstep } from '@core/math';
import { SITE } from '../../../model/layout';
import { mergeParts } from '../../parts/context';
import { GROUND } from './groundGrid';
import { fractalNoise, hash2 } from './noise';

export interface Bush {
  x: number;
  z: number;
  size: number;
  tone: number;
  seed: number;
}

export const BUSHES = {
  count: 56,
  area: { x: [-90, 190], z: [-95, 95] },
  keepOut: { x: 8, z: 5 },
  size: [0.45, 1.25],
  blobs: [3, 5],
  squash: 0.68,
  lumps: { scale: 2.4, depth: 0.42 },
  detail: 1,
  sink: 0.3,
  shadow: 0.5,
  tones: ['#4f4d34', '#5f5538', '#46503a', '#585036'],
  seed: 61,
} as const;

const RGB = 3;
const CANDIDATES_PER_BUSH = 4;
const LUMP_OCTAVES = 2;
const SEEDS = { x: 0, z: 1, size: 2, tone: 3, blobs: 4, offset: 5 } as const;

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
    if (nearRun(x, z)) continue;
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
  const colours: number[] = [];
  const colour = new Color();
  for (let index = 0; index < position.count; index += 1) {
    const lift = smoothstep(position.getY(index) - GROUND.level, 0, height);
    colour.copy(tone).multiplyScalar(lerp(BUSHES.shadow, 1, lift));
    colours.push(colour.r, colour.g, colour.b);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colours, RGB));
}

function blob(bush: Bush, index: number, template: BufferGeometry): BufferGeometry {
  const seed = bush.seed * 7 + index;
  const radius = bush.size * lerp(0.55, 1, hash2(seed, BUSHES.seed + SEEDS.size));
  const angle = hash2(seed, BUSHES.seed + SEEDS.offset) * Math.PI * 2;
  const reach = index === 0 ? 0 : bush.size * 0.6;
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
  shaded(geometry, tone, bush.size * BUSHES.squash * 2);
  return geometry;
}

export function bushesGeometry(bushes: readonly Bush[]): BufferGeometry {
  const template = blobTemplate();
  const geometry = mergeParts(bushes.map((bush) => bushGeometry(bush, template)));
  template.dispose();
  return geometry;
}
