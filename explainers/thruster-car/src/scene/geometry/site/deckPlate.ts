import { smoothstep } from '@core/math';
import type { DataTexture } from 'three';
import { THEME } from '../../../theme';
import { hash2, tileNoise } from './noise';
import { DECK } from './rampSpec';
import { band, mixRgb, normalTexture, paintTexture, shade, srgb } from './textures';
import type { Rgba } from './textures';

export const DECK_PLATE = {
  size: { width: 128, height: 256 },
  hazard: { period: 0.3, edge: 0.012, wear: 0.22 },
  grip: { spacing: 0.75, width: 0.15, soft: 0.01 },
  seam: { width: 0.008, depth: 0.55 },
  bolt: { spacing: 0.25, inset: 0.05, radius: 0.012 },
  mottle: 0.14,
  tread: { metres: 0.24, size: 128, cells: 4, length: 0.4, width: 0.085, strength: 3 },
  seed: 31,
} as const;

export const HAZARD_YELLOW = '#e2b23a';
const STEEL = srgb(THEME.rampSteel);
const YELLOW = srgb(HAZARD_YELLOW);
const DARK = srgb('#24262b');
const GRIT = srgb('#33353a');
const OCTAVES = 3;
const SEEDS = { mottle: 1, wear: 2, grit: 3 } as const;
const NOISE = {
  mottle: tileNoise({ u: 6, v: 12 }, OCTAVES, DECK_PLATE.seed + SEEDS.mottle),
  wear: tileNoise({ u: 20, v: 40 }, OCTAVES, DECK_PLATE.seed + SEEDS.wear),
} as const;
const DIAGONAL = Math.SQRT1_2;

function hazardShade(along: number, across: number, wear: number): Rgba {
  const { period, edge } = DECK_PLATE.hazard;
  const phase = ((((along + Math.abs(across)) / period) % 1) + 1) % 1;
  const yellow = smoothstep(phase, 0.5 - edge, 0.5 + edge) * (1 - smoothstep(phase, 1 - edge, 1));
  const colour = mixRgb(DARK, mixRgb(YELLOW, STEEL, wear), yellow);
  return shade(colour, 1);
}

function seamShade(along: number, across: number): number {
  const { seam, bolt } = DECK_PLATE;
  const toSeam = Math.min(along, DECK.plateLength - along);
  const boltAcross = Math.abs(
    (((across % bolt.spacing) + bolt.spacing) % bolt.spacing) - bolt.spacing / 2,
  );
  const boltRing = Math.hypot(toSeam - bolt.inset, boltAcross);
  return (
    (1 - seam.depth * band(toSeam, 0, seam.width)) * (1 - 0.35 * band(boltRing, 0, bolt.radius))
  );
}

function gripShare(along: number): number {
  const { spacing, width, soft } = DECK_PLATE.grip;
  const offset = Math.abs((along % spacing) - spacing / 2);
  return 1 - smoothstep(offset, width / 2 - soft, width / 2 + soft);
}

export function deckShade(u: number, v: number): Rgba {
  const { size, hazard, mottle, seed } = DECK_PLATE;
  const along = u * DECK.plateLength;
  const across = DECK.halfWidth - v * DECK.halfWidth * 2;
  const wear = smoothstep(NOISE.wear(u, v), 0.55, 0.8);
  if (Math.abs(across) > DECK.halfWidth - DECK.hazardWidth) {
    return hazardShade(along, across, wear * hazard.wear);
  }
  const cloud = NOISE.mottle(u, v);
  const speck = hash2(Math.floor(u * size.width), Math.floor(v * size.height), seed + SEEDS.grit);
  const grit = mixRgb(GRIT, STEEL, speck > 0.82 ? 0.6 : 0);
  const plate = mixRgb(STEEL, grit, gripShare(along));
  return shade(plate, (1 + mottle * (cloud - 0.5)) * seamShade(along, across));
}

export function treadHeight(u: number, v: number): number {
  const { cells, length, width } = DECK_PLATE.tread;
  const column = Math.floor(u * cells);
  const row = Math.floor(v * cells);
  const x = u * cells - column - 0.5;
  const y = v * cells - row - 0.5;
  const turn = (column + row) % 2 === 0 ? 1 : -1;
  const along = (x + turn * y) * DIAGONAL;
  const across = (turn * x - y) * DIAGONAL;
  const lens = 1 - (along / length) ** 2 - (across / width) ** 2;
  return smoothstep(lens, 0, 0.35);
}

export interface DeckMaps {
  map: DataTexture;
  normal: DataTexture;
}

export function deckMaps(): DeckMaps {
  const { size, tread } = DECK_PLATE;
  const normal = normalTexture(
    { width: tread.size, height: tread.size },
    treadHeight,
    tread.strength,
  );
  normal.repeat.set(DECK.plateLength / tread.metres, (DECK.halfWidth * 2) / tread.metres);
  return { map: paintTexture(size, deckShade), normal };
}
