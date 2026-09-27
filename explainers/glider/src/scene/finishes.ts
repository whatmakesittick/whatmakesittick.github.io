import { DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';
import { COLUMN } from './constants';

const SOFT_GLOW = 0.35;
const WIND_GLOW = 0.3;
const ARROW_GLOW = 0.45;
const DRAG_TONE = '#f5c451';

export const FINISHES = {
  gelcoat: { color: '#f4f2ec', metalness: 0.05, roughness: 0.3 },
  glass: { color: '#1d2a36', metalness: 0.4, roughness: 0.08 },
  tip: {
    color: THEME.accent,
    metalness: 0.2,
    roughness: 0.45,
    emissive: THEME.accent,
    emissiveIntensity: SOFT_GLOW,
  },
  cumulus: {
    color: '#fbf8f2',
    emissive: '#d9d5cc',
    emissiveIntensity: SOFT_GLOW,
    metalness: 0,
    roughness: 0.95,
    flatShading: true,
  },
  rotor: { color: '#c3c8cf', metalness: 0, roughness: 1, flatShading: true },
  lenticular: { color: '#f3f6fa', metalness: 0, roughness: 0.7 },
  column: {
    color: THEME.thermal,
    emissive: THEME.thermal,
    emissiveIntensity: SOFT_GLOW,
    metalness: 0,
    roughness: 1,
    transparent: true,
    opacity: COLUMN.opacity,
    depthWrite: false,
    side: DoubleSide,
  },
  wind: {
    color: '#e8eef5',
    metalness: 0.1,
    roughness: 0.5,
    emissive: '#9fb7cf',
    emissiveIntensity: WIND_GLOW,
  },
} as const satisfies Record<string, MaterialFinish>;

export type Finish = keyof typeof FINISHES;

export const FORCE_FINISHES = {
  lift: { color: THEME.glide, emissive: THEME.glide, emissiveIntensity: ARROW_GLOW },
  weight: { color: THEME.sinking, emissive: THEME.sinking, emissiveIntensity: ARROW_GLOW },
  drag: { color: DRAG_TONE, emissive: DRAG_TONE, emissiveIntensity: ARROW_GLOW },
} as const satisfies Record<string, MaterialFinish>;
