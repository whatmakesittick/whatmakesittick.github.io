import { lerp } from '@core/math';

export interface GrainPacking {
  spacing: number;
  flatten: number;
}

export interface Grain {
  x: number;
  y: number;
  radius: number;
  shade: number;
}

const HEX_ROW_SHARE = Math.sqrt(3) / 2;
const HEX_MAX_COVER = Math.PI / (2 * Math.sqrt(3));
const TOUCHING_RADIUS_SHARE = 0.5;
const CLOSED_RADIUS_SHARE = 1 / Math.sqrt(3);
const JITTER_SHARE = 0.16;
const SIZE_SPREAD = 0.3;
const UINT32_RANGE = 2 ** 32;
const MULBERRY = { increment: 0x6d2b79f5, shiftA: 15, shiftB: 7, shiftC: 14, mixB: 61 } as const;

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + MULBERRY.increment) >>> 0;
    let value = Math.imul(state ^ (state >>> MULBERRY.shiftA), state | 1);
    value ^= value + Math.imul(value ^ (value >>> MULBERRY.shiftB), value | MULBERRY.mixB);
    return ((value ^ (value >>> MULBERRY.shiftC)) >>> 0) / UINT32_RANGE;
  };
}

export function grainRadius(packing: GrainPacking, porosity: number): number {
  const cover = 1 - porosity;
  if (cover <= HEX_MAX_COVER) {
    return packing.spacing * Math.sqrt((cover * HEX_ROW_SHARE) / Math.PI);
  }
  const closing = (cover - HEX_MAX_COVER) / (1 - HEX_MAX_COVER);
  return packing.spacing * lerp(TOUCHING_RADIUS_SHARE, CLOSED_RADIUS_SHARE, closing);
}

export function packGrains(
  width: number,
  height: number,
  packing: GrainPacking,
  porosity: number,
  seed: number,
): Grain[] {
  const random = seededRandom(seed);
  const { spacing } = packing;
  const rowStep = spacing * HEX_ROW_SHARE * packing.flatten;
  const radius = grainRadius(packing, porosity);
  const grains: Grain[] = [];
  for (let row = -1; row * rowStep < height + rowStep; row++) {
    const shift = (row & 1) * (spacing / 2);
    for (let x = -spacing + shift; x < width + spacing; x += spacing) {
      grains.push({
        x: x + (random() - 0.5) * 2 * JITTER_SHARE * spacing,
        y: row * rowStep + (random() - 0.5) * 2 * JITTER_SHARE * rowStep,
        radius: radius * (1 + (random() - 0.5) * SIZE_SPREAD),
        shade: random(),
      });
    }
  }
  return grains;
}
