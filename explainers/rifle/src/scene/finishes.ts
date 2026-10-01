import { Color } from 'three';
import type { Texture } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';

export interface Look {
  surface: MaterialFinish;
  cut: MaterialFinish;
}

export interface SurfaceMaps {
  stock: Texture;
  handguard: Texture;
  powder: Texture;
}

const METAL_REFLECTION = 2;
const POLISH_REFLECTION = 2.4;
const WOOD_REFLECTION = 0.9;
const LACQUER_TINT = 0.35;

export const PAINT = {
  blued: THEME.bluedSteel,
  bluedCut: '#a3abb5',
  steel: THEME.steel,
  brightSteel: THEME.brightSteel,
  brightCut: '#eef1f4',
  wood: THEME.wood,
  woodCut: THEME.woodLight,
  bakelite: THEME.bakelite,
  bakeliteCut: '#95553d',
  hole: '#05070a',
  caseCut: '#e3c77a',
  brass: THEME.brass,
  powder: THEME.powder,
  copper: THEME.copper,
  engraving: '#5a2c12',
} as const;

const LACQUERED_BRASS = new Color(THEME.brass).lerp(new Color(THEME.caseLacquer), LACQUER_TINT);

export const FINISHES = {
  blued: { color: PAINT.blued, metalness: 0.7, roughness: 0.32, envMapIntensity: METAL_REFLECTION },
  bluedCut: {
    color: PAINT.bluedCut,
    metalness: 0.8,
    roughness: 0.3,
    envMapIntensity: METAL_REFLECTION,
  },
  steel: { color: PAINT.steel, metalness: 0.9, roughness: 0.28, envMapIntensity: METAL_REFLECTION },
  bright: {
    color: PAINT.brightSteel,
    metalness: 1,
    roughness: 0.2,
    envMapIntensity: POLISH_REFLECTION,
  },
  brightCut: {
    color: PAINT.brightCut,
    metalness: 0.9,
    roughness: 0.3,
    envMapIntensity: METAL_REFLECTION,
  },
  bakelite: {
    color: PAINT.bakelite,
    metalness: 0,
    roughness: 0.3,
    envMapIntensity: 1.1,
  },
  bakeliteCut: {
    color: PAINT.bakeliteCut,
    metalness: 0,
    roughness: 0.8,
    envMapIntensity: WOOD_REFLECTION,
  },
  hole: { color: PAINT.hole, metalness: 0, roughness: 1, envMapIntensity: 0 },
  caseLacquer: {
    color: LACQUERED_BRASS,
    metalness: 0.85,
    roughness: 0.3,
    envMapIntensity: METAL_REFLECTION,
  },
  caseCut: {
    color: PAINT.caseCut,
    metalness: 0.8,
    roughness: 0.32,
    envMapIntensity: METAL_REFLECTION,
  },
  brass: { color: PAINT.brass, metalness: 0.9, roughness: 0.3, envMapIntensity: METAL_REFLECTION },
  copper: {
    color: PAINT.copper,
    metalness: 0.95,
    roughness: 0.24,
    envMapIntensity: POLISH_REFLECTION,
  },
  engraving: {
    color: PAINT.engraving,
    metalness: 0.8,
    roughness: 0.5,
    envMapIntensity: METAL_REFLECTION,
  },
  ghost: {
    color: PAINT.brightSteel,
    metalness: 0.3,
    roughness: 0.5,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  },
} as const satisfies Record<string, MaterialFinish>;

function wood(map: Texture): Look {
  return {
    surface: {
      color: PAINT.wood,
      map,
      metalness: 0,
      roughness: 0.42,
      envMapIntensity: WOOD_REFLECTION,
    },
    cut: { color: PAINT.woodCut, map, metalness: 0, roughness: 0.85, envMapIntensity: 0.5 },
  };
}

function powder(map: Texture): Look {
  const grains = { color: '#ffffff', map, metalness: 0, roughness: 0.9, envMapIntensity: 0.5 };
  return { surface: grains, cut: grains };
}

export interface Looks {
  case: Look;
  primer: Look;
  powder: Look;
  copper: Look;
  engraving: Look;
  blued: Look;
  steel: Look;
  bright: Look;
  bakelite: Look;
  hole: Look;
  stock: Look;
  handguard: Look;
}

export function createLooks(maps: SurfaceMaps): Looks {
  return {
    case: { surface: FINISHES.caseLacquer, cut: FINISHES.caseCut },
    primer: { surface: FINISHES.brass, cut: FINISHES.caseCut },
    powder: powder(maps.powder),
    copper: { surface: FINISHES.copper, cut: FINISHES.copper },
    engraving: { surface: FINISHES.engraving, cut: FINISHES.engraving },
    blued: { surface: FINISHES.blued, cut: FINISHES.bluedCut },
    steel: { surface: FINISHES.steel, cut: FINISHES.bluedCut },
    bright: { surface: FINISHES.bright, cut: FINISHES.brightCut },
    bakelite: { surface: FINISHES.bakelite, cut: FINISHES.bakeliteCut },
    hole: { surface: FINISHES.hole, cut: FINISHES.hole },
    stock: wood(maps.stock),
    handguard: wood(maps.handguard),
  };
}
