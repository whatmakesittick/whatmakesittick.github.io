import { Vector2 } from 'three';
import type { Texture } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../../../theme';

export const WORLD_PAINT = {
  startLine: '#c9a646',
  deckUnderside: '#555c66',
  supportSteel: '#5a6068',
  railSteel: '#a9b0b8',
  pitConcrete: '#9b958d',
  white: '#ffffff',
} as const;

const PAINT_ALPHA_TEST = 0.5;
const CARD_ALPHA_TEST = 0.45;
const PAINT_OFFSET = -2;
const CONCRETE_RELIEF = 0.55;
const TREAD_RELIEF = 0.9;

export const WORLD_FINISHES = {
  bushes: {
    color: WORLD_PAINT.white,
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0,
  },
  cones: { color: WORLD_PAINT.white, vertexColors: true, roughness: 0.55, metalness: 0 },
  deckUnderside: { color: WORLD_PAINT.deckUnderside, roughness: 0.62, metalness: 0.55 },
  rails: { color: WORLD_PAINT.railSteel, roughness: 0.32, metalness: 0.85 },
  supports: { color: WORLD_PAINT.supportSteel, roughness: 0.58, metalness: 0.5 },
} as const satisfies Record<string, MaterialFinish>;

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
  pit: { color: WORLD_PAINT.pitConcrete, roughness: 0.93, envMapIntensity: 1 },
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

export function deckFinish(map: Texture, normalMap: Texture): MaterialFinish {
  return {
    color: WORLD_PAINT.white,
    map,
    normalMap,
    normalScale: new Vector2(TREAD_RELIEF, TREAD_RELIEF),
    roughness: 0.5,
    metalness: 0.45,
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

export const MARK_COLOURS = { start: WORLD_PAINT.startLine, landing: THEME.paint } as const;
