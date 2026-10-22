import type { FieldKind } from './ground/fieldKinds';

export interface KindLook {
  readonly colours: readonly string[];
  readonly beds?: { readonly spacing: number; readonly width: number; readonly shade: number };
}

export const FIELD_LOOKS: Readonly<Record<FieldKind, KindLook>> = {
  greens: {
    colours: ['#6c8a43', '#7a984c', '#5d7b3b', '#86a057'],
    beds: { spacing: 1.9, width: 0.5, shade: 0.8 },
  },
  paddy: {
    colours: ['#8f9f4a', '#a2a855', '#97a44f', '#b0ac5e'],
    beds: { spacing: 4.2, width: 0.6, shade: 0.93 },
  },
  stubble: {
    colours: ['#b39b60', '#a89058', '#bea76f', '#c2ad7a'],
    beds: { spacing: 3.4, width: 0.9, shade: 0.9 },
  },
  soil: {
    colours: ['#8a7357', '#7b654c', '#947c5e', '#857055'],
    beds: { spacing: 1.5, width: 0.55, shade: 0.82 },
  },
  fallow: { colours: ['#8c9562', '#838c59', '#979d6a'] },
  orchard: { colours: ['#748a4c', '#6b8246'] },
  flooded: {
    colours: ['#8f9f86', '#87997f', '#97a58b'],
    beds: { spacing: 2.6, width: 0.7, shade: 0.88 },
  },
  greenhouse: { colours: ['#dcdfd8', '#d3d7cf', '#e2e3dd'] },
  pond: { colours: ['#7f9599', '#86999a'] },
};

export const LAND_PAINT = {
  ditch: '#596645',
  bund: '#a29f72',
  bundWidth: 0.55,
  bundAlpha: 0.55,
  toneSpread: 0.12,
  lengthShade: 0.1,
  orchardDot: { colour: '#4c6334', spacing: 4.5, radius: 1.5 },
  greenhouseRidge: '#f4f4f0',
  greenhouseEdge: '#a8ab9f',
  pondBank: '#7a8655',
  pondInset: 2.6,
  water: { edge: '#687d81', middle: '#97aaab', glint: '#c9d6d8', glintAlpha: 0.3 },
  waterBank: '#6c7346',
  road: { verge: '#a29a82', surface: '#6d6c68', line: '#e6e4dc', lineWidth: 0.16 },
  lane: { verge: '#918b6d', surface: '#b1ab9b' },
  dash: { length: 3, gap: 6 },
  glint: { length: [1.5, 5], width: 0.22, density: 0.04 },
} as const;

export const CORRIDOR_PAINT = {
  mown: '#8b9b5b',
  mowShade: 0.94,
  grass: '#869359',
  fence: '#5b5f5c',
  service: '#a9a496',
  serviceJoint: '#8e8a7e',
  serviceJointSpacing: 6,
  formation: '#9a9282',
  ditch: '#52604f',
  reeds: '#6d7a45',
  footing: '#a19d93',
} as const;

export const SHADOW_PAINT = { tint: '#6f7889', strength: 0.62, reduction: 8 } as const;
export const MOTTLE = [
  { cells: [24, 40], amount: 0.16 },
  { cells: [160, 260], amount: 0.1 },
] as const;
