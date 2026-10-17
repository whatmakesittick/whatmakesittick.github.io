import { lerp, smoothstep } from '@core/math';
import type { DataTexture } from 'three';
import { SITE } from '../../../model/layout';
import { THEME } from '../../../theme';
import { fractalNoise, hash2, tileNoise } from './noise';
import { mixRgb, paintTexture, shade, srgb } from './textures';
import type { Rgb, Rgba } from './textures';

export const SCRUB = {
  metres: 12,
  size: 384,
  tufts: {
    cells: 40,
    chance: 0.9,
    clump: { from: 0.38, to: 0.62 },
    spread: [0.1, 0.9],
    radius: [0.24, 0.5],
    blades: 13,
    spikes: 0.3,
    edge: 0.25,
    core: 0.35,
    bladeShade: 0.6,
    shadow: 0.45,
    shadowSoft: 0.6,
    shift: 0.45,
  },
  bare: { from: 0.6, to: 0.82, share: 0.45 },
  dark: { from: 0.56, to: 0.8, depth: 0.18 },
  grain: 0.25,
  seed: 23,
} as const;

export const GROUND_TINT = {
  patches: { metres: 60, depth: 0.42 },
  fields: { metres: 26, from: 0.5, to: 0.7, warmth: 0.6 },
  burns: { metres: 90, from: 0.6, to: 0.75, depth: 0.35 },
  verge: { reach: 5, lift: 0.3 },
  distance: { from: 60, to: 380, depth: 0.45 },
  seed: 41,
} as const;

const BASE = srgb(THEME.scrub);
const STRAW = srgb('#6c5a3c');
const STRAW_SHADE = srgb('#3b3325');
const DIRT = srgb('#5e5040');
const DIRT_TINT: Rgb = [1.18, 1.04, 0.86];
const PLAIN: Rgb = [1, 1, 1];
const OCTAVES = 3;
const TINT_OCTAVES = 4;
const NEIGHBOURS = [-1, 0, 1] as const;
const SEEDS = { bare: 1, dark: 3, grain: 4, patches: 5, fields: 6, tufts: 7, burns: 8 };
const NOISE = {
  bare: tileNoise({ u: 4, v: 4 }, OCTAVES, SCRUB.seed + SEEDS.bare),
  dark: tileNoise({ u: 2, v: 2 }, OCTAVES, SCRUB.seed + SEEDS.dark),
  grain: tileNoise({ u: 96, v: 96 }, 2, SCRUB.seed + SEEDS.grain),
  clump: tileNoise({ u: 6, v: 6 }, OCTAVES, SCRUB.seed + SEEDS.tufts),
} as const;

interface TuftField {
  present: Uint8Array;
  x: Float32Array;
  y: Float32Array;
  radius: Float32Array;
  phase: Float32Array;
}

function tuftField(): TuftField {
  const { cells, chance, clump, spread, radius } = SCRUB.tufts;
  const count = cells * cells;
  const field: TuftField = {
    present: new Uint8Array(count),
    x: new Float32Array(count),
    y: new Float32Array(count),
    radius: new Float32Array(count),
    phase: new Float32Array(count),
  };
  for (let index = 0; index < count; index += 1) {
    const seed = SCRUB.seed + SEEDS.tufts;
    const column = index % cells;
    const row = Math.floor(index / cells);
    const grassy = smoothstep(NOISE.clump(column / cells, row / cells), clump.from, clump.to);
    field.present[index] = hash2(index, 0, seed) < chance * grassy ? 1 : 0;
    field.x[index] = lerp(spread[0], spread[1], hash2(index, 1, seed));
    field.y[index] = lerp(spread[0], spread[1], hash2(index, 2, seed));
    field.radius[index] = lerp(radius[0], radius[1], hash2(index, 3, seed));
    field.phase[index] = hash2(index, 4, seed) * Math.PI * 2;
  }
  return field;
}

const TUFTS = tuftField();

export interface Tuft {
  cover: number;
  light: number;
  shadow: number;
}

function bladeAt(dx: number, dy: number, phase: number): number {
  return 0.5 + 0.5 * Math.sin(Math.atan2(dy, dx) * SCRUB.tufts.blades + phase);
}

export function tuftAt(u: number, v: number): Tuft {
  const { cells, edge, shift, spikes, core, bladeShade, shadowSoft } = SCRUB.tufts;
  const x = (u - Math.floor(u)) * cells;
  const y = (v - Math.floor(v)) * cells;
  const column = Math.floor(x);
  const row = Math.floor(y);
  const tuft: Tuft = { cover: 0, light: 0, shadow: 0 };
  for (const dy of NEIGHBOURS) {
    for (const dx of NEIGHBOURS) {
      const index = ((row + dy + cells) % cells) * cells + ((column + dx + cells) % cells);
      if (!TUFTS.present[index]) continue;
      const offsetX = x - (column + dx + TUFTS.x[index]);
      const offsetY = y - (row + dy + TUFTS.y[index]);
      const r = TUFTS.radius[index];
      const blade = bladeAt(offsetX, offsetY, TUFTS.phase[index]);
      const reach = Math.hypot(offsetX, offsetY) / (r * (1 - spikes + spikes * blade));
      const shaded = 1 - smoothstep(Math.hypot(offsetX - shift * r, offsetY) / r, shadowSoft, 1);
      tuft.shadow = Math.max(tuft.shadow, shaded);
      const cover = 1 - smoothstep(reach, 1 - edge, 1);
      if (cover > tuft.cover) {
        tuft.cover = cover;
        tuft.light = lerp(core, 1, Math.min(reach, 1)) * lerp(bladeShade, 1, blade);
      }
    }
  }
  return tuft;
}

export function scrubShade(u: number, v: number): Rgba {
  const { bare, dark, grain, tufts } = SCRUB;
  const open = smoothstep(NOISE.bare(u, v), bare.from, bare.to) * bare.share;
  const tuft = tuftAt(u, v);
  const soil = mixRgb(BASE, DIRT, open);
  const straw = mixRgb(STRAW_SHADE, STRAW, tuft.light);
  const colour = mixRgb(soil, straw, tuft.cover * (1 - open));
  const level =
    (1 - tufts.shadow * tuft.shadow * (1 - tuft.cover)) *
    (1 - dark.depth * smoothstep(NOISE.dark(u, v), dark.from, dark.to)) *
    (1 - grain * (0.5 - NOISE.grain(u, v)));
  return shade(colour, level);
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

function noiseAt(x: number, z: number, metres: number, seed: number): number {
  return fractalNoise(x / metres, z / metres, TINT_OCTAVES, GROUND_TINT.seed + seed);
}

export function groundTint(x: number, z: number): Rgb {
  const { patches, fields, burns, verge, distance } = GROUND_TINT;
  const reach = distanceToRun(x, z);
  const dust = 1 - smoothstep(reach, 0, verge.reach);
  const field = smoothstep(noiseAt(x, z, fields.metres, SEEDS.fields), fields.from, fields.to);
  const burn = smoothstep(noiseAt(x, z, burns.metres, SEEDS.burns), burns.from, burns.to);
  const warm = Math.max(field * fields.warmth, dust);
  const level =
    (1 + patches.depth * (noiseAt(x, z, patches.metres, SEEDS.patches) - 0.5)) *
    (1 + verge.lift * dust) *
    (1 - burns.depth * burn) *
    (1 - distance.depth * smoothstep(reach, distance.from, distance.to));
  const tint = mixRgb(PLAIN, DIRT_TINT, warm);
  return [tint[0] * level, tint[1] * level, tint[2] * level];
}
