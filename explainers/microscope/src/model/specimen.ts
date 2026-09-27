import { lerp } from '@core/math';

export interface SpecimenWindow {
  centerX: number;
  centerY: number;
  size: number;
}

export interface Nucleus {
  x: number;
  y: number;
  radius: number;
}

export interface SpecimenCell {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  outline: readonly number[];
  nucleus: Nucleus;
}

export const CHEEK_CELL = {
  spacing: 72,
  jitter: 0.32,
  radius: { min: 25, max: 30 },
  nucleusRadius: { min: 3.5, max: 5 },
  nucleusShift: 0.35,
  outlinePoints: 9,
  outlineWobble: 0.16,
} as const;

const DENSITY = { base: 0.3, clump: 0.62, clumpX: -420, clumpY: 260, clumpRadius: 520 } as const;

const HASH = { x: 374761393, y: 668265263, salt: 1442695041, mix: 1274126177 } as const;
const HASH_RANGE = 4294967296;

const SALT = {
  presence: 0,
  offsetX: 1,
  offsetY: 2,
  radius: 3,
  rotation: 4,
  nucleusAngle: 5,
  nucleusShift: 6,
  nucleusRadius: 7,
  outline: 8,
} as const;

function hash(i: number, j: number, salt: number): number {
  let h = Math.imul(i, HASH.x) + Math.imul(j, HASH.y) + Math.imul(salt, HASH.salt);
  h = Math.imul(h ^ (h >>> 13), HASH.mix);
  h ^= h >>> 16;
  return (h >>> 0) / HASH_RANGE;
}

export function cellDensity(x: number, y: number): number {
  const distance = Math.hypot(x - DENSITY.clumpX, y - DENSITY.clumpY) / DENSITY.clumpRadius;
  return DENSITY.base + DENSITY.clump * Math.exp(-distance * distance);
}

function between(range: { min: number; max: number }, share: number): number {
  return lerp(range.min, range.max, share);
}

function cellAt(i: number, j: number): SpecimenCell | null {
  const { spacing, jitter, radius, nucleusRadius, nucleusShift, outlinePoints, outlineWobble } =
    CHEEK_CELL;
  const x = (i + (hash(i, j, SALT.offsetX) - 0.5) * 2 * jitter) * spacing;
  const y = (j + (hash(i, j, SALT.offsetY) - 0.5) * 2 * jitter) * spacing;
  if (hash(i, j, SALT.presence) >= cellDensity(x, y)) return null;
  const size = between(radius, hash(i, j, SALT.radius));
  const angle = hash(i, j, SALT.nucleusAngle) * Math.PI * 2;
  const shift = hash(i, j, SALT.nucleusShift) * nucleusShift * size;
  return {
    x,
    y,
    radius: size,
    rotation: hash(i, j, SALT.rotation) * Math.PI * 2,
    outline: Array.from(
      { length: outlinePoints },
      (_, index) => 1 + (hash(i, j, SALT.outline + index) - 0.5) * 2 * outlineWobble,
    ),
    nucleus: {
      x: x + shift * Math.cos(angle),
      y: y + shift * Math.sin(angle),
      radius: between(nucleusRadius, hash(i, j, SALT.nucleusRadius)),
    },
  };
}

export function cellsInWindow(window: SpecimenWindow): SpecimenCell[] {
  const reach = window.size / 2 + CHEEK_CELL.radius.max * (1 + CHEEK_CELL.outlineWobble);
  const first = (center: number) => Math.floor((center - reach) / CHEEK_CELL.spacing) - 1;
  const last = (center: number) => Math.ceil((center + reach) / CHEEK_CELL.spacing) + 1;
  const cells: SpecimenCell[] = [];
  for (let i = first(window.centerX); i <= last(window.centerX); i++) {
    for (let j = first(window.centerY); j <= last(window.centerY); j++) {
      const cell = cellAt(i, j);
      if (
        cell &&
        Math.abs(cell.x - window.centerX) <= reach &&
        Math.abs(cell.y - window.centerY) <= reach
      ) {
        cells.push(cell);
      }
    }
  }
  return cells;
}
