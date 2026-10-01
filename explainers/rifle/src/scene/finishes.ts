import type { Texture } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';

export interface Look {
  surface: MaterialFinish;
  cut: MaterialFinish;
}

export interface WoodGrains {
  stock: Texture;
  handguard: Texture;
}

const METAL_REFLECTION = 2.2;
const POLISH_REFLECTION = 2.4;
const WOOD_REFLECTION = 0.8;

export const PAINT = {
  blued: THEME.bluedSteel,
  bluedCut: '#9aa2ac',
  steel: THEME.steel,
  brightSteel: THEME.brightSteel,
  brightCut: '#eef1f4',
  wood: THEME.wood,
  woodCut: THEME.woodLight,
  bakelite: THEME.bakelite,
  bakeliteCut: '#95553d',
  hole: '#05070a',
  caseLacquer: THEME.caseLacquer,
  caseCut: '#a9b08f',
  brass: THEME.brass,
  brassCut: '#e3c77a',
  powder: THEME.powder,
  powderCut: '#4a4235',
  copper: THEME.copper,
  engraving: '#5a2c12',
} as const;

export const FINISHES = {
  blued: { color: PAINT.blued, metalness: 0.6, roughness: 0.36, envMapIntensity: METAL_REFLECTION },
  bluedCut: {
    color: PAINT.bluedCut,
    metalness: 0.75,
    roughness: 0.34,
    envMapIntensity: METAL_REFLECTION,
  },
  steel: { color: PAINT.steel, metalness: 0.9, roughness: 0.3, envMapIntensity: METAL_REFLECTION },
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
    roughness: 0.4,
    envMapIntensity: WOOD_REFLECTION,
  },
  bakeliteCut: {
    color: PAINT.bakeliteCut,
    metalness: 0,
    roughness: 0.8,
    envMapIntensity: WOOD_REFLECTION,
  },
  hole: { color: PAINT.hole, metalness: 0, roughness: 1, envMapIntensity: 0 },
  caseLacquer: {
    color: PAINT.caseLacquer,
    metalness: 0.45,
    roughness: 0.42,
    envMapIntensity: METAL_REFLECTION,
  },
  caseCut: {
    color: PAINT.caseCut,
    metalness: 0.7,
    roughness: 0.35,
    envMapIntensity: METAL_REFLECTION,
  },
  brass: { color: PAINT.brass, metalness: 0.9, roughness: 0.3, envMapIntensity: METAL_REFLECTION },
  brassCut: {
    color: PAINT.brassCut,
    metalness: 0.8,
    roughness: 0.35,
    envMapIntensity: METAL_REFLECTION,
  },
  powder: { color: PAINT.powder, metalness: 0, roughness: 0.95, envMapIntensity: 0.4 },
  powderCut: { color: PAINT.powderCut, metalness: 0, roughness: 1, envMapIntensity: 0.4 },
  copper: {
    color: PAINT.copper,
    metalness: 0.95,
    roughness: 0.28,
    envMapIntensity: POLISH_REFLECTION,
  },
  ghost: {
    color: PAINT.brightSteel,
    metalness: 0.3,
    roughness: 0.5,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  },
  engraving: {
    color: PAINT.engraving,
    metalness: 0.8,
    roughness: 0.5,
    envMapIntensity: METAL_REFLECTION,
  },
} as const satisfies Record<string, MaterialFinish>;

function wood(map: Texture): Look {
  return {
    surface: {
      color: PAINT.wood,
      map,
      metalness: 0,
      roughness: 0.48,
      envMapIntensity: WOOD_REFLECTION,
    },
    cut: { color: PAINT.woodCut, map, metalness: 0, roughness: 0.85, envMapIntensity: 0.5 },
  };
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

export function createLooks(grains: WoodGrains): Looks {
  return {
    case: { surface: FINISHES.caseLacquer, cut: FINISHES.caseCut },
    primer: { surface: FINISHES.brass, cut: FINISHES.brassCut },
    powder: { surface: FINISHES.powder, cut: FINISHES.powderCut },
    copper: { surface: FINISHES.copper, cut: FINISHES.copper },
    engraving: { surface: FINISHES.engraving, cut: FINISHES.engraving },
    blued: { surface: FINISHES.blued, cut: FINISHES.bluedCut },
    steel: { surface: FINISHES.steel, cut: FINISHES.bluedCut },
    bright: { surface: FINISHES.bright, cut: FINISHES.brightCut },
    bakelite: { surface: FINISHES.bakelite, cut: FINISHES.bakeliteCut },
    hole: { surface: FINISHES.hole, cut: FINISHES.hole },
    stock: wood(grains.stock),
    handguard: wood(grains.handguard),
  };
}
