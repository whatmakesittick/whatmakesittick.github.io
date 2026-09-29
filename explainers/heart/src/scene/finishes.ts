import { Color, DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';

const WET_ROUGHNESS = 0.38;
const CUT_ROUGHNESS = 0.72;
const VESSEL_ROUGHNESS = 0.5;
const NODE_GLOW = 1;
const BLACK = '#000000';
const VESSEL_GLASS_OPACITY = 0.55;

export function desaturate(hex: string, saturation: number, brightness: number): string {
  const color = new Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  return `#${color.setHSL(hsl.h, hsl.s * saturation, hsl.l * brightness).getHexString()}`;
}

function tissue(color: string, roughness: number): MaterialFinish {
  return { color, roughness, metalness: 0, emissive: BLACK, emissiveIntensity: 1 };
}

export const FINISHES = {
  epicardium: { ...tissue('#ffffff', WET_ROUGHNESS), vertexColors: true },
  cavity: tissue(THEME.cavity, WET_ROUGHNESS),
  cut: { ...tissue('#ffffff', CUT_ROUGHNESS), vertexColors: true },
  papillary: tissue(THEME.muscle, WET_ROUGHNESS),
  leaflet: { ...tissue(THEME.valve, 0.55), side: DoubleSide },
  ring: tissue(desaturate(THEME.valve, 0.9, 0.86), 0.5),
  chorda: tissue('#f6ece2', 0.5),
  vessel: { ...tissue('#ffffff', VESSEL_ROUGHNESS), vertexColors: true },
  vesselGlass: {
    ...tissue('#ffffff', VESSEL_ROUGHNESS),
    vertexColors: true,
    transparent: true,
    opacity: VESSEL_GLASS_OPACITY,
    depthWrite: false,
  },
  coronary: tissue(desaturate(THEME.arterial, 0.85, 0.85), 0.45),
  node: {
    color: desaturate(THEME.node, 1, 0.7),
    emissive: BLACK,
    emissiveIntensity: NODE_GLOW,
    roughness: 0.4,
    metalness: 0,
  },
} as const satisfies Record<string, MaterialFinish>;

export type Finish = keyof typeof FINISHES;
