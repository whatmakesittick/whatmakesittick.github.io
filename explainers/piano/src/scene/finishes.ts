import { DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';

const GLASS_OPACITY = 0.18;
const GHOST_OPACITY = 0.38;
const INSET_OPACITY = 0.94;
const DARK_WOOD = '#2b1e15';
const BLACK_MATTE = '#0b0b0d';
const PIN_STEEL = '#a7adb5';

function finish(color: string, roughness: number, metalness = 0): MaterialFinish {
  return { color, roughness, metalness };
}

function veil(color: string, opacity: number): MaterialFinish {
  return {
    color,
    roughness: 0.15,
    transparent: true,
    opacity,
    depthWrite: false,
    side: DoubleSide,
  };
}

export const FINISHES = {
  caseGloss: finish(THEME.caseBlack, 0.14),
  rimGloss: finish(THEME.caseBlack, 0.14),
  blackMatte: finish(BLACK_MATTE, 0.8),
  darkWood: finish(DARK_WOOD, 0.7),
  plateGold: finish(THEME.plateGold, 0.36, 0.62),
  steel: finish(THEME.steel, 0.22, 0.92),
  pinSteel: finish(PIN_STEEL, 0.3, 0.9),
  copper: finish(THEME.copper, 0.32, 0.88),
  spruce: finish(THEME.spruce, 0.55),
  rib: finish(THEME.rib, 0.7),
  bridgeWood: finish(THEME.bridgeWood, 0.6),
  felt: finish(THEME.felt, 0.95),
  cloth: finish(THEME.cloth, 0.95),
  keyWood: finish(THEME.keyWood, 0.75),
  ivory: finish(THEME.ivory, 0.3),
  ebony: finish(THEME.ebony, 0.32),
  brass: finish(THEME.brass, 0.28, 0.88),
  stage: finish(THEME.stage, 0.85),
  section: { ...finish(THEME.section, 0.8), side: DoubleSide },
  glass: veil(THEME.glass, GLASS_OPACITY),
  ghost: { ...veil(THEME.ghost, GHOST_OPACITY), emissive: THEME.ghost, emissiveIntensity: 0.15 },
  inset: { ...finish(THEME.inset, 0.9), transparent: true, opacity: INSET_OPACITY },
} as const satisfies Record<string, MaterialFinish>;

export type Finish = keyof typeof FINISHES;

export const UNCUT_FINISHES: ReadonlySet<MaterialFinish> = new Set([
  FINISHES.section,
  FINISHES.glass,
]);
