import { Color } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';

const BLACK = '#000000';
const WET_SKIN_ROUGHNESS = 0.5;
const SKIN_TONE = { saturation: 1.15, brightness: 0.9 } as const;
const SILICONE_ROUGHNESS = 0.28;
const SUIT_ROUGHNESS = 0.78;
const LANE_ROUGHNESS = 0.62;
const LENS_ROUGHNESS = 0.12;
const PLASTIC_ROUGHNESS = 0.45;
const ARROW_GLOW = 0.35;

function shade(hex: string, tone: { saturation: number; brightness: number }): string {
  const hsl = { h: 0, s: 0, l: 0 };
  const color = new Color(hex);
  color.getHSL(hsl);
  return `#${color.setHSL(hsl.h, Math.min(hsl.s * tone.saturation, 1), hsl.l * tone.brightness).getHexString()}`;
}

function matte(color: string, roughness: number): MaterialFinish {
  return { color, roughness, metalness: 0, emissive: BLACK, emissiveIntensity: 1 };
}

export const FINISHES = {
  skin: matte(shade(THEME.skin, SKIN_TONE), WET_SKIN_ROUGHNESS),
  suit: matte(THEME.suit, SUIT_ROUGHNESS),
  cap: matte(THEME.cap, SILICONE_ROUGHNESS),
  capStripe: matte(THEME.floatB, SILICONE_ROUGHNESS),
  wristband: matte(THEME.floatA, SILICONE_ROUGHNESS),
  goggleBand: matte(THEME.goggles, SILICONE_ROUGHNESS),
  goggleLens: { ...matte(THEME.goggles, LENS_ROUGHNESS), metalness: 0.6 },
  floatA: matte(THEME.floatA, PLASTIC_ROUGHNESS),
  floatB: matte(THEME.floatB, PLASTIC_ROUGHNESS),
  ropeCord: matte(THEME.laneLine, PLASTIC_ROUGHNESS),
  laneLine: matte(THEME.laneLine, LANE_ROUGHNESS),
  thrust: {
    ...matte(THEME.thrust, PLASTIC_ROUGHNESS),
    emissive: THEME.thrust,
    emissiveIntensity: ARROW_GLOW,
  },
  drag: {
    ...matte(THEME.drag, PLASTIC_ROUGHNESS),
    emissive: THEME.drag,
    emissiveIntensity: ARROW_GLOW,
  },
} as const satisfies Record<string, MaterialFinish>;

export type Finish = keyof typeof FINISHES;
