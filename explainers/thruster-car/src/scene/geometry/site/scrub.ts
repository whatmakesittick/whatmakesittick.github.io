import { smoothstep } from '@core/math';
import type { DataTexture } from 'three';
import { SITE } from '../../../model/layout';
import { THEME } from '../../../theme';
import { fractalNoise, hash2, tileNoise } from './noise';
import { mixRgb, paintTexture, shade, srgb } from './textures';
import type { Rgb, Rgba } from './textures';

export const SCRUB = {
  metres: 12,
  size: 256,
  dirt: { from: 0.58, to: 0.78, share: 0.55 },
  straw: { density: 0.26, from: 0.42, to: 0.85, haze: 0.18 },
  gaps: 0.22,
  seed: 23,
} as const;

export const GROUND_TINT = {
  patches: { metres: 60, depth: 0.42 },
  fields: { metres: 26, from: 0.5, to: 0.7, warmth: 0.7 },
  verge: { reach: 5, lift: 0.3 },
  seed: 41,
} as const;

const BASE = srgb(THEME.scrub);
const STRAW = srgb('#6b5d43');
const DIRT = srgb('#5a4d3d');
const DIRT_TINT: Rgb = [1.18, 1.04, 0.86];
const PLAIN: Rgb = [1, 1, 1];
const OCTAVES = 3;
const TINT_OCTAVES = 4;
const BLADE_OCTAVES = 2;
const SEEDS = { dirt: 1, tufts: 2, blades: 3, speck: 4, patches: 5, fields: 6 } as const;
const NOISE = {
  dirt: tileNoise({ u: 4, v: 4 }, OCTAVES, SCRUB.seed + SEEDS.dirt),
  tufts: tileNoise({ u: 18, v: 18 }, OCTAVES, SCRUB.seed + SEEDS.tufts),
  blades: tileNoise({ u: 64, v: 64 }, BLADE_OCTAVES, SCRUB.seed + SEEDS.blades),
} as const;

export function scrubShade(u: number, v: number): Rgba {
  const { dirt, straw, gaps, seed, size } = SCRUB;
  const bare = smoothstep(NOISE.dirt(u, v), dirt.from, dirt.to);
  const tufts = NOISE.tufts(u, v);
  const blades = NOISE.blades(u, v);
  const speck = hash2(Math.floor(u * size), Math.floor(v * size), seed + SEEDS.speck);
  const dry = smoothstep(tufts, straw.from, straw.to) * (1 - bare);
  const fleck = speck > 1 - straw.density * dry ? 1 : 0;
  const ground = mixRgb(BASE, DIRT, bare * dirt.share);
  const colour = mixRgb(ground, STRAW, Math.max(fleck, dry * straw.haze));
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
