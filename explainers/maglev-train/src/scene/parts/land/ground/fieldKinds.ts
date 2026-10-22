import type { Range } from '../random';

export const FIELD_KINDS = [
  'greens',
  'paddy',
  'stubble',
  'soil',
  'fallow',
  'orchard',
  'flooded',
  'greenhouse',
  'pond',
] as const;

export type FieldKind = (typeof FIELD_KINDS)[number];
export type CropKind = Exclude<FieldKind, 'greenhouse'>;

export interface Zone {
  readonly until: number;
  readonly strip: Range;
  readonly depth: number;
  readonly length: number;
  readonly greenhouseChance: number;
  readonly weights: Readonly<Record<CropKind, number>>;
}

export const ZONES: readonly Zone[] = [
  {
    until: 160,
    strip: [7, 20],
    depth: 64,
    length: 150,
    greenhouseChance: 0.22,
    weights: {
      greens: 5,
      paddy: 4,
      stubble: 3,
      soil: 2,
      fallow: 1,
      orchard: 1,
      flooded: 0.5,
      pond: 0.5,
    },
  },
  {
    until: 640,
    strip: [12, 34],
    depth: 110,
    length: 200,
    greenhouseChance: 0.12,
    weights: {
      greens: 4,
      paddy: 5,
      stubble: 3,
      soil: 1.5,
      fallow: 1.5,
      orchard: 1.2,
      flooded: 0.45,
      pond: 0.7,
    },
  },
  {
    until: Infinity,
    strip: [24, 70],
    depth: 220,
    length: 400,
    greenhouseChance: 0,
    weights: {
      greens: 3,
      paddy: 5,
      stubble: 3,
      soil: 1,
      fallow: 2,
      orchard: 1.5,
      flooded: 0.4,
      pond: 0.6,
    },
  },
];

export const GREENHOUSE = { width: 8, gap: 2.6, maxLength: 64, margin: 3 } as const;
export const KIND_RUN: Range = [1, 4];
export const DITCH_GAP = 1.6;
export const ALONG_X_SHARE = 0.45;

export function zoneAt(z: number): Zone {
  const distance = Math.abs(z);
  return ZONES.find((zone) => distance < zone.until) ?? ZONES[ZONES.length - 1];
}
