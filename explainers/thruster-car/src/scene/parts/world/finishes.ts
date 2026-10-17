import { Vector2 } from 'three';
import type { Texture } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../../../theme';

export const WORLD_PAINT = {
  startLine: '#c9a646',
  deckUnderside: '#6f7a87',
  supportSteel: '#76828f',
  railSteel: '#bcc5cf',
  pitConcrete: '#9b958d',
  white: '#ffffff',
} as const;

const PAINT_ALPHA_TEST = 0.5;
const CARD_ALPHA_TEST = 0.45;
const PAINT_OFFSET = -2;
const CONCRETE_RELIEF = 0.55;
const TREAD_RELIEF = 0.9;
const STEEL_REFLECTION = 0.8;
const DECK_REFLECTION = 0.55;

export const WORLD_FINISHES = {
  bushes: {
    color: WORLD_PAINT.white,
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0,
  },
  cones: { color: WORLD_PAINT.white, vertexColors: true, roughness: 0.55, metalness: 0 },
} as const satisfies Record<string, MaterialFinish>;

export interface SteelFinishes {
  deckUnderside: MaterialFinish;
  rails: MaterialFinish;
  supports: MaterialFinish;
}

export function steelFinishes(envMap: Texture): SteelFinishes {
  return {
    deckUnderside: { color: WORLD_PAINT.deckUnderside, roughness: 0.5, metalness: 0.6, envMap },
    rails: { color: WORLD_PAINT.railSteel, roughness: 0.26, metalness: 0.9, envMap },
    supports: {
      color: WORLD_PAINT.supportSteel,
      roughness: 0.42,
      metalness: 0.62,
      envMap,
      envMapIntensity: STEEL_REFLECTION,
    },
  };
}

export function groundFinish(map: Texture): MaterialFinish {
  return {
    color: WORLD_PAINT.white,
    map,
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0,
  };
}

export function decalFinish(map: Texture): MaterialFinish {
  return {
    color: WORLD_PAINT.white,
    map,
    transparent: true,
    depthWrite: false,
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0,
    polygonOffset: true,
    polygonOffsetFactor: PAINT_OFFSET,
    polygonOffsetUnits: PAINT_OFFSET,
  };
}

export function cardFinish(map: Texture): MaterialFinish {
  return {
    color: WORLD_PAINT.white,
    map,
    vertexColors: true,
    alphaTest: CARD_ALPHA_TEST,
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0,
  };
}

export interface ConcreteLook {
  color: string;
  roughness: number;
  envMapIntensity: number;
}

export const CONCRETE_LOOKS = {
  runway: { color: WORLD_PAINT.white, roughness: 0.7, envMapIntensity: 0.45 },
  footing: { color: WORLD_PAINT.pitConcrete, roughness: 0.93, envMapIntensity: 1 },
} as const satisfies Record<string, ConcreteLook>;

export function concreteFinish(
  map: Texture,
  normalMap: Texture,
  look: ConcreteLook,
): MaterialFinish {
  return {
    ...look,
    map,
    normalMap,
    normalScale: new Vector2(CONCRETE_RELIEF, CONCRETE_RELIEF),
    metalness: 0,
  };
}

export function deckFinish(map: Texture, normalMap: Texture, envMap: Texture): MaterialFinish {
  return {
    color: WORLD_PAINT.white,
    map,
    normalMap,
    envMap,
    normalScale: new Vector2(TREAD_RELIEF, TREAD_RELIEF),
    roughness: 0.5,
    metalness: 0.32,
    envMapIntensity: DECK_REFLECTION,
  };
}

export function paintFinish(map: Texture, color: string): MaterialFinish {
  return {
    color,
    map,
    alphaTest: PAINT_ALPHA_TEST,
    roughness: 0.78,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: PAINT_OFFSET,
    polygonOffsetUnits: PAINT_OFFSET,
  };
}

export const MARK_COLOURS = {
  start: WORLD_PAINT.startLine,
  landing: THEME.paint,
  finish: THEME.paint,
} as const;
