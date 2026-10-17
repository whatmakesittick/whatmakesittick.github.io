import { smoothstep } from '@core/math';
import type { DataTexture } from 'three';
import { SITE } from '../../../model/layout';
import { THEME } from '../../../theme';
import { hash2, tileNoise } from './noise';
import { band, mixRgb, normalTexture, paintTexture, shade, srgb } from './textures';
import type { Rgba } from './textures';

export const CONCRETE = {
  tile: { length: 24, width: SITE.run.z[1] - SITE.run.z[0] },
  slabLength: 6,
  laneEdge: 3,
  slabTint: 0.09,
  mottle: 0.16,
  grain: 0.07,
  joint: { width: 0.03, depth: 0.5, lip: 0.05, lipLight: 0.08 },
  tyre: { track: 0.82, width: 0.11, depth: 0.2, haze: 1.1, hazeDepth: 0.05 },
  stain: { from: 0.66, to: 0.78, depth: 0.16 },
  size: { width: 512, height: 256 },
  grit: { metres: 2, size: 256, strength: 2.2 },
  seed: 11,
} as const;

const BASE = srgb(THEME.concrete);
const WARM = srgb('#8a7c6c');
const CELLS = { mottle: { u: 16, v: 8 }, stain: { u: 8, v: 4 }, rubber: { u: 48, v: 2 } } as const;
const GRIT_CELLS = { u: 24, v: 24 };
const OCTAVES = 3;
const SEEDS = { slab: 1, mottle: 2, stain: 3, rubber: 4, warm: 5, grit: 6, pits: 7 } as const;
const PIT_SHARE = 0.965;
const LANES = [-CONCRETE.laneEdge, CONCRETE.laneEdge] as const;

function nearestJoint(x: number, z: number): number {
  const along = Math.abs(
    ((x + CONCRETE.slabLength / 2) % CONCRETE.slabLength) - CONCRETE.slabLength / 2,
  );
  const across = Math.min(...LANES.map((lane) => Math.abs(z - lane)));
  return Math.min(along, across);
}

function slabTint(x: number, z: number): number {
  const column = Math.floor(x / CONCRETE.slabLength);
  const lane = z < LANES[0] ? 0 : z < LANES[1] ? 1 : 2;
  return 1 + (hash2(column, lane, CONCRETE.seed + SEEDS.slab) - 0.5) * CONCRETE.slabTint * 2;
}

function jointShade(x: number, z: number): number {
  const { width, depth, lip, lipLight } = CONCRETE.joint;
  const distance = nearestJoint(x, z);
  return 1 - depth * band(distance, 0, width) + lipLight * band(distance, lip, width);
}

function tyreShade(u: number, v: number, z: number): number {
  const { track, width, depth, haze, hazeDepth } = CONCRETE.tyre;
  const rubber = tileNoise(u, v, CELLS.rubber, OCTAVES, CONCRETE.seed + SEEDS.rubber);
  const streak = Math.max(band(z, -track, width), band(z, track, width));
  return 1 - depth * streak * smoothstep(rubber, 0.3, 0.75) - hazeDepth * band(z, 0, haze);
}

export function concreteShade(u: number, v: number): Rgba {
  const { tile, mottle, grain, stain, seed } = CONCRETE;
  const x = u * tile.length;
  const z = v * tile.width - tile.width / 2;
  const cloud = tileNoise(u, v, CELLS.mottle, OCTAVES, seed + SEEDS.mottle);
  const blot = tileNoise(u, v, CELLS.stain, OCTAVES, seed + SEEDS.stain);
  const speck = hash2(
    Math.floor(u * CONCRETE.size.width),
    Math.floor(v * CONCRETE.size.height),
    seed,
  );
  const warmth = tileNoise(u, v, CELLS.stain, OCTAVES, seed + SEEDS.warm);
  const level =
    slabTint(x, z) *
    (1 + mottle * (cloud - 0.5)) *
    (1 + grain * (speck - 0.5)) *
    jointShade(x, z) *
    tyreShade(u, v, z) *
    (1 - stain.depth * smoothstep(blot, stain.from, stain.to));
  return shade(mixRgb(BASE, WARM, smoothstep(warmth, 0.45, 0.8) * 0.5), level);
}

export function gritHeight(u: number, v: number): number {
  const { size } = CONCRETE.grit;
  const surface = tileNoise(u, v, GRIT_CELLS, OCTAVES, CONCRETE.seed + SEEDS.grit);
  const pit = hash2(Math.floor(u * size), Math.floor(v * size), CONCRETE.seed + SEEDS.pits);
  return surface - (pit > PIT_SHARE ? 1 : 0) * 0.6;
}

export interface ConcreteMaps {
  map: DataTexture;
  normal: DataTexture;
}

export function concreteMaps(): ConcreteMaps {
  const { size, grit, tile } = CONCRETE;
  const map = paintTexture(size, concreteShade);
  map.repeat.set(1 / tile.length, 1 / tile.width);
  map.offset.set(-SITE.run.x[0] / tile.length, -SITE.run.z[0] / tile.width);
  const normal = normalTexture({ width: grit.size, height: grit.size }, gritHeight, grit.strength);
  normal.repeat.set(1 / grit.metres, 1 / grit.metres);
  return { map, normal };
}
