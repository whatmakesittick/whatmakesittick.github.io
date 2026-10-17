import type { RowSwatch } from './swatch';

export type Range = readonly [min: number, max: number];

export interface PaintRule<K> {
  swatch: RowSwatch;
  x: Range;
  band: K;
}

function within(value: number, [min, max]: Range): boolean {
  return value >= min && value <= max;
}

export function ruleSwatch(
  rules: readonly PaintRule<Range>[],
  x: number,
  at: number,
  fallback: RowSwatch,
): RowSwatch {
  return rules.find((rule) => within(x, rule.x) && within(at, rule.band))?.swatch ?? fallback;
}

export function bandSwatch(
  rules: readonly PaintRule<readonly number[]>[],
  x: number,
  band: number,
  fallback: RowSwatch,
): RowSwatch {
  return rules.find((rule) => within(x, rule.x) && rule.band.includes(band))?.swatch ?? fallback;
}

export function seamRules<K>(centres: readonly number[], gap: number, band: K): PaintRule<K>[] {
  return centres.map((x) => ({ swatch: 'seam', x: [x - gap, x + gap], band }));
}
