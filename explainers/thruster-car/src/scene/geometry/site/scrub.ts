import { smoothstep } from '@core/math';
import type { DataTexture } from 'three';
import { SITE } from '../../../model/layout';
import { THEME } from '../../../theme';
import { fractalNoise, hash2, tileNoise } from './noise';
import { mixRgb, paintTexture, shade, srgb } from './textures';
import type { Rgb, Rgba } from './textures';

export const SCRUB = {
  metres: 9,
  size: 256,
  dirt: { from: 0.56, to: 0.7 },
  straw: { density: 0.55, from: 0.35, to: 0.75 },
  gaps: 0.28,
  seed: 23,
} as const;

export const GROUND_TINT = {
  patches: { metres: 70, depth: 0.32 },
  fields: { metres: 32, from: 0.55, to: 0.72, warmth: 0.35 },
  verge: { reach: 5, lift: 0.35 },
  seed: 41,
} as const;

const BASE = srgb(THEME.scrub);
const STRAW = srgb('#7a6a4b');
const DIRT = srgb('#5a4d3d');
const DIRT_TINT: Rgb = [1.18, 1.04, 0.86];
const PLAIN: Rgb = [1, 1, 1];
const OCTAVES = 3;
const TINT_OCTAVES = 4;
const CELLS = { dirt: { u: 4, v: 4 }, tufts: { u: 18, v: 18 }, blades: { u: 64, v: 64 } } as const;
const SEEDS = { dirt: 1, tufts: 2, blades: 3, speck: 4, patches: 5, fields: 6 } as const;

export function scrubShade(u: number, v: number): Rgba {
  const { dirt, straw, gaps, seed, size } = SCRUB;
  const bare = smoothstep(
    tileNoise(u, v, CELLS.dirt, OCTAVES, seed + SEEDS.dirt),
    dirt.from,
    dirt.to,
  );
  const tufts = tileNoise(u, v, CELLS.tufts, OCTAVES, seed + SEEDS.tufts);
  const blades = tileNoise(u, v, CELLS.blades, 2, seed + SEEDS.blades);
  const speck = hash2(Math.floor(u * size), Math.floor(v * size), seed + SEEDS.speck);
  const dry = smoothstep(tufts, straw.from, straw.to) * (1 - bare);
  const fleck = speck > 1 - straw.density * dry ? 1 : 0;
  const ground = mixRgb(BASE, DIRT, bare);
  const colour = mixRgb(ground, STRAW, Math.max(fleck, dry * 0.35));
  return shade(colour, 1 - gaps * (1 - blades) * (1 - bare));
}

export function scrubMap(): DataTexture {
  const texture = paintTexture({ width: SCRUB.size, height: SCRUB.size }, scrubShade);
  texture.repeat.set(1 / SCRUB.metres, 1 / SCRUB.metres);
  return texture;
}

function distanceToRun(x: number, z: number): number {
  const { x: runX, z: runZ } = SITE.run;
  const dx = Math.max(runX[0] - x, 0, x - runX[1]);
  const dz = Math.max(runZ[0] - z, 0, z - runZ[1]);
  return Math.hypot(dx, dz);
}

export function groundTint(x: number, z: number): Rgb {
  const { patches, fields, verge, seed } = GROUND_TINT;
  const light = fractalNoise(
    x / patches.metres,
    z / patches.metres,
    TINT_OCTAVES,
    seed + SEEDS.patches,
  );
  const field = fractalNoise(
    x / fields.metres,
    z / fields.metres,
    TINT_OCTAVES,
    seed + SEEDS.fields,
  );
  const dust = 1 - smoothstep(distanceToRun(x, z), 0, verge.reach);
  const warm = Math.max(smoothstep(field, fields.from, fields.to) * fields.warmth, dust);
  const level = (1 + patches.depth * (light - 0.5)) * (1 + verge.lift * dust);
  const tint = mixRgb(PLAIN, DIRT_TINT, warm);
  return [tint[0] * level, tint[1] * level, tint[2] * level];
}
