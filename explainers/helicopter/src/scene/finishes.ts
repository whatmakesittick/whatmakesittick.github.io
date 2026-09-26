import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';

const PAINT_GLOW = 0.25;

export const FINISHES = {
  body: { color: '#e9e7e1', metalness: 0.05, roughness: 0.34 },
  panel: { color: '#c9ced6', metalness: 0.8, roughness: 0.3 },
  glass: { color: '#1c2833', metalness: 0.4, roughness: 0.08 },
  blade: { color: '#454c56', metalness: 0.55, roughness: 0.42 },
  tipStripe: { color: '#eeebe4', metalness: 0, roughness: 0.3 },
  forged: { color: '#9ba3ae', metalness: 0.9, roughness: 0.3 },
  polished: { color: '#dde1e7', metalness: 1, roughness: 0.22 },
  darkSteel: { color: '#5a626d', metalness: 0.85, roughness: 0.36 },
  skid: { color: '#b7bdc6', metalness: 0.85, roughness: 0.28 },
  paint: {
    color: THEME.accent,
    metalness: 0.2,
    roughness: 0.45,
    emissive: THEME.accent,
    emissiveIntensity: PAINT_GLOW,
  },
} as const satisfies Record<string, MaterialFinish>;

export type Finish = keyof typeof FINISHES;
