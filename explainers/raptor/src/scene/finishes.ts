import { DoubleSide, Vector2 } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';
import type { SurfaceTextures } from './geometry/surfaceTextures';
import type { TintStop } from './geometry/heatTint';

const METAL_REFLECTION = 1.8;
const POLISH_REFLECTION = 2.4;
const COAT_REFLECTION = 1.4;
const COAT_METALNESS = 0.42;
const COAT_ROUGHNESS = 0.64;
const BRUSHED_NORMAL = new Vector2(0.35, 0.35);
const CHANNEL_NORMAL_INNER = new Vector2(0.9, 0.9);
const WHITE = '#ffffff';
const LINER_GLOW = '#ffb46a';
const BLACK = '#000000';

export const PAINT = {
  coat: '#2c2f34',
  steel: THEME.steel,
  brightSteel: '#e2e6eb',
  inconel: '#a8987c',
  copper: '#c4845a',
  channel: '#6e4128',
  cut: THEME.darkSteel,
  cavity: '#3e424a',
  shield: '#2a2d33',
  booster: '#c4c7cc',
} as const;

export const BELL_OUTER_TINT: readonly TintStop[] = [
  [-310, '#3b3a44'],
  [-300, '#37363b'],
  [-285, PAINT.coat],
  [-170, PAINT.coat],
];

export const BELL_INNER_TINT: readonly TintStop[] = [
  [-310, '#8e96a3'],
  [-285, '#6e7ea8'],
  [-255, '#7d6f98'],
  [-222, '#b89a6a'],
  [-190, '#c8a574'],
  [-165, '#c08a5e'],
];

function coat(roughness: number): MaterialFinish {
  return {
    color: PAINT.coat,
    metalness: COAT_METALNESS,
    roughness,
    envMapIntensity: COAT_REFLECTION,
  };
}

function glowing(base: MaterialFinish, emissive: string): MaterialFinish {
  return { ...base, emissive, emissiveIntensity: 0 };
}

export const STATIC_FINISHES = {
  steel: {
    color: PAINT.steel,
    metalness: 0.95,
    roughness: 0.28,
    envMapIntensity: METAL_REFLECTION,
  },
  brightSteel: {
    color: PAINT.brightSteel,
    metalness: 1,
    roughness: 0.16,
    envMapIntensity: POLISH_REFLECTION,
  },
  rotor: {
    color: PAINT.brightSteel,
    metalness: 1,
    roughness: 0.2,
    envMapIntensity: POLISH_REFLECTION,
    side: DoubleSide,
    forceSinglePass: true,
  },
  inconel: {
    color: PAINT.inconel,
    metalness: 0.95,
    roughness: 0.3,
    envMapIntensity: METAL_REFLECTION,
  },
  copper: {
    color: PAINT.copper,
    metalness: 0.95,
    roughness: 0.32,
    envMapIntensity: METAL_REFLECTION,
  },
  cut: { color: PAINT.cut, metalness: 0.2, roughness: 0.6, envMapIntensity: 1.3 },
  cavity: { color: PAINT.cavity, metalness: 0.8, roughness: 0.5, envMapIntensity: 1.2 },
  channel: { color: PAINT.channel, metalness: 0.7, roughness: 0.5, envMapIntensity: 1 },
  duct: { ...coat(COAT_ROUGHNESS), side: DoubleSide, forceSinglePass: true },
  shield: { color: PAINT.shield, metalness: 0.3, roughness: 0.78, envMapIntensity: 0.8 },
  preburnerShell: glowing(coat(COAT_ROUGHNESS), '#ffb072'),
  oxygenFlame: glowing(
    { color: PAINT.cavity, metalness: 0.8, roughness: 0.5 },
    THEME.oxygenRichGas,
  ),
  methaneFlame: glowing(
    { color: PAINT.cavity, metalness: 0.8, roughness: 0.5 },
    THEME.methaneRichGas,
  ),
  black: { color: BLACK, metalness: 0, roughness: 1 },
} as const satisfies Record<string, MaterialFinish>;

export interface Finishes extends Readonly<typeof STATIC_FINISHES> {
  coat: MaterialFinish;
  bellOuter: MaterialFinish;
  bellInner: MaterialFinish;
  liner: MaterialFinish;
  booster: MaterialFinish;
  clusterInner: MaterialFinish;
}

export function createFinishes(surfaces: SurfaceTextures): Finishes {
  const brushed = surfaces.brushed;
  const innerChannels = surfaces.channels;
  return {
    ...STATIC_FINISHES,
    coat: { ...coat(COAT_ROUGHNESS), normalMap: brushed, normalScale: BRUSHED_NORMAL },
    bellOuter: {
      color: WHITE,
      vertexColors: true,
      metalness: COAT_METALNESS,
      roughness: COAT_ROUGHNESS,
      envMapIntensity: COAT_REFLECTION,
    },
    bellInner: {
      color: WHITE,
      vertexColors: true,
      metalness: 0.9,
      roughness: 0.36,
      envMapIntensity: METAL_REFLECTION,
      normalMap: innerChannels,
      normalScale: CHANNEL_NORMAL_INNER,
      emissive: THEME.hotWall,
      emissiveIntensity: 0,
      emissiveMap: surfaces.heat,
    },
    liner: {
      color: PAINT.copper,
      metalness: 0.95,
      roughness: 0.34,
      envMapIntensity: METAL_REFLECTION,
      normalMap: innerChannels,
      normalScale: CHANNEL_NORMAL_INNER,
      emissive: LINER_GLOW,
      emissiveIntensity: 0,
      emissiveMap: surfaces.heat,
    },
    booster: {
      color: PAINT.booster,
      map: surfaces.panels,
      metalness: 0.88,
      roughness: 0.46,
      envMapIntensity: 1.05,
    },
    clusterInner: {
      color: WHITE,
      vertexColors: true,
      metalness: 0.85,
      roughness: 0.45,
      envMapIntensity: 1.2,
      emissive: THEME.hotWall,
      emissiveIntensity: 0,
      emissiveMap: surfaces.heat,
    },
  };
}
