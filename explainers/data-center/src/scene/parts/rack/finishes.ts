import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../../../theme';

export const RACK_FINISHES = {
  board: { color: '#244334', roughness: 0.72, metalness: 0.05 },
  package: { color: '#39463f', roughness: 0.6, metalness: 0.1 },
  coldPlate: { color: '#c2c7cc', roughness: 0.3, metalness: 0.85 },
  heatSink: { color: '#a3abb3', roughness: 0.38, metalness: 0.75 },
  chipGlow: {
    color: THEME.current,
    emissive: THEME.current,
    emissiveIntensity: 1.1,
    roughness: 0.9,
  },
  bezel: { color: '#1d2126', roughness: 0.5, metalness: 0.35 },
  fanBlade: { color: '#3b4148', roughness: 0.6, metalness: 0.1 },
  port: { color: '#0b0d10', roughness: 0.9 },
  insulator: { color: '#25282c', roughness: 0.8 },
  deskLeg: { color: '#4a4f55', roughness: 0.45, metalness: 0.6 },
  keyboard: { color: '#2b2f34', roughness: 0.8 },
  screen: { color: '#cfe6ff', emissive: '#9ccbf6', emissiveIntensity: 1.2, roughness: 0.25 },
} as const satisfies Record<string, MaterialFinish>;
