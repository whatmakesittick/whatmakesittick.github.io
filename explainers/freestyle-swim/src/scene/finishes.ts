import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';

const BLACK = '#000000';
const WET_SKIN_ROUGHNESS = 0.42;
const SILICONE_ROUGHNESS = 0.28;
const SUIT_ROUGHNESS = 0.62;
const LENS_ROUGHNESS = 0.12;
const PLASTIC_ROUGHNESS = 0.45;
const ARROW_GLOW = 0.35;

function matte(color: string, roughness: number): MaterialFinish {
  return { color, roughness, metalness: 0, emissive: BLACK, emissiveIntensity: 1 };
}

export const FINISHES = {
  skinLeft: matte(THEME.skin, WET_SKIN_ROUGHNESS),
  skinRight: matte(THEME.rightSide, WET_SKIN_ROUGHNESS),
  torso: matte(THEME.skin, WET_SKIN_ROUGHNESS),
  suit: matte(THEME.suit, SUIT_ROUGHNESS),
  cap: matte(THEME.cap, SILICONE_ROUGHNESS),
  goggleBand: matte(THEME.goggles, SILICONE_ROUGHNESS),
  goggleLens: { ...matte(THEME.goggles, LENS_ROUGHNESS), metalness: 0.6 },
  floatA: matte(THEME.floatA, PLASTIC_ROUGHNESS),
  floatB: matte(THEME.floatB, PLASTIC_ROUGHNESS),
  ropeCord: matte(THEME.laneLine, PLASTIC_ROUGHNESS),
  laneLine: matte(THEME.laneLine, SUIT_ROUGHNESS),
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
