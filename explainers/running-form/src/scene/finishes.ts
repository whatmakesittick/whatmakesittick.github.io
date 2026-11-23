import { DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';

const BLACK = '#000000';
const ARROW_GLOW = 0.45;

function matte(color: string, roughness: number, metalness = 0): MaterialFinish {
  return { color, roughness, metalness, emissive: BLACK, emissiveIntensity: 1 };
}

export const FINISHES = {
  skin: matte(THEME.skin, 0.62),
  singlet: matte(THEME.singlet, 0.85),
  shorts: matte(THEME.shorts, 0.8),
  cap: matte(THEME.shorts, 0.75),
  rightShoe: matte(THEME.rightAccent, 0.55),
  leftShoe: matte(THEME.leftAccent, 0.55),
  sole: matte(THEME.shoe, 0.7),
  rail: matte('#9aa1a6', 0.38, 0.65),
  post: matte('#efece4', 0.55),
  reflector: { ...matte('#ff9a3c', 0.3), emissive: '#ff8a2a', emissiveIntensity: 0.6 },
  lampPole: matte('#6f777c', 0.45, 0.55),
  lampHead: matte('#4f5458', 0.5, 0.4),
  bark: matte('#4d4036', 0.95),
  foliage: { ...matte('#ffffff', 0.9), vertexColors: true },
  shrub: { ...matte('#ffffff', 0.92), vertexColors: true },
  tuft: { ...matte('#ffffff', 0.9), vertexColors: true, side: DoubleSide },
  forceArrow: {
    ...matte(THEME.forceArrow, 0.35),
    emissive: THEME.forceArrow,
    emissiveIntensity: ARROW_GLOW,
    transparent: true,
  },
  bodyWeightArrow: {
    ...matte(THEME.bodyWeightArrow, 0.35),
    emissive: THEME.bodyWeightArrow,
    emissiveIntensity: ARROW_GLOW,
    transparent: true,
  },
} as const satisfies Record<string, MaterialFinish>;

export type Finish = keyof typeof FINISHES;
