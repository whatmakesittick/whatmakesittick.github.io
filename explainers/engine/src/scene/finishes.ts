import { Color, DoubleSide } from 'three';
import type { MeshStandardMaterial } from 'three';
import { createMaterial } from '@core/scene/materials';
import type { MaterialFinish, STRUCTURE_GROUP } from '@core/scene/materials';
import type { PartId } from '../state';
import { THEME } from '../theme';

export type Finish =
  | 'casting'
  | 'liner'
  | 'alloy'
  | 'ring'
  | 'forged'
  | 'polished'
  | 'spring'
  | 'port'
  | 'ceramic'
  | 'darkSteel'
  | 'paint'
  | 'gasket';

export type EmphasisGroup = PartId | typeof STRUCTURE_GROUP;

const PAINT_GLOW = 0.25;

const SURFACE_TONE = {
  castingDarkness: 0.55,
  castingShade: 0.62,
  linerShade: 0.75,
  cutWarmth: 0.3,
  cutShade: 0.62,
  gasketShade: 0.45,
} as const;

export const SURFACE_COLORS = {
  casting: new Color(THEME.metal)
    .lerp(new Color(THEME.metalDark), SURFACE_TONE.castingDarkness)
    .multiplyScalar(SURFACE_TONE.castingShade),
  liner: new Color(THEME.metal).multiplyScalar(SURFACE_TONE.linerShade),
  cut: new Color(THEME.metalLight)
    .lerp(new Color(THEME.accent), SURFACE_TONE.cutWarmth)
    .multiplyScalar(SURFACE_TONE.cutShade),
  gasket: new Color(THEME.metalDark).multiplyScalar(SURFACE_TONE.gasketShade),
} as const;

export const FINISHES: Record<Finish, MaterialFinish> = {
  casting: { color: '#ffffff', vertexColors: true, metalness: 0.45, roughness: 0.5 },
  liner: { color: '#ffffff', vertexColors: true, metalness: 0.85, roughness: 0.28 },
  alloy: { color: '#c9ced6', metalness: 0.8, roughness: 0.3 },
  ring: { color: THEME.metalDark, metalness: 0.9, roughness: 0.35 },
  forged: { color: '#9ba3ae', metalness: 0.9, roughness: 0.3 },
  polished: { color: '#dde1e7', metalness: 1, roughness: 0.22 },
  spring: { color: '#61707f', metalness: 0.8, roughness: 0.32 },
  port: { color: '#59616c', metalness: 0.45, roughness: 0.65, side: DoubleSide },
  ceramic: { color: '#eeebe4', metalness: 0, roughness: 0.3 },
  darkSteel: { color: '#5a626d', metalness: 0.85, roughness: 0.36 },
  gasket: { color: '#ffffff', vertexColors: true, metalness: 0.2, roughness: 0.85 },
  paint: {
    color: THEME.accent,
    metalness: 0.2,
    roughness: 0.45,
    emissive: THEME.accent,
    emissiveIntensity: PAINT_GLOW,
  },
};

export function createFinish(finish: Finish): MeshStandardMaterial {
  return createMaterial(FINISHES[finish]);
}
