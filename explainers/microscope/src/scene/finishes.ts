import { DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';

const BULB_GLOW = 1.6;
const GLASS_GLOW = 0.12;

export const FINISHES = {
  enamel: { color: '#e6e3dc', metalness: 0.05, roughness: 0.42 },
  cut: { color: '#b9c0c9', metalness: 0.2, roughness: 0.6, side: DoubleSide },
  stage: { color: '#2f343c', metalness: 0.35, roughness: 0.5 },
  rubber: { color: '#25292f', metalness: 0.1, roughness: 0.75 },
  steel: { color: '#c3c9d1', metalness: 0.85, roughness: 0.3 },
  chrome: { color: '#dde1e7', metalness: 1, roughness: 0.18 },
  interior: { color: '#3b4048', metalness: 0.2, roughness: 0.7, side: DoubleSide },
  glass: {
    color: '#cdeeff',
    metalness: 0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    emissive: '#7cc7ff',
    emissiveIntensity: GLASS_GLOW,
  },
  slideGlass: {
    color: '#e3f4ff',
    metalness: 0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  },
  oil: {
    color: '#f1d59a',
    metalness: 0,
    roughness: 0.1,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  },
  bulb: {
    color: '#fff6dc',
    metalness: 0,
    roughness: 0.3,
    emissive: '#ffd27a',
    emissiveIntensity: BULB_GLOW,
  },
  sclera: { color: '#f1ebe1', metalness: 0, roughness: 0.55, side: DoubleSide },
  retina: { color: '#c65a4e', metalness: 0, roughness: 0.7, side: DoubleSide },
  mat: { color: '#101318', metalness: 0, roughness: 0.95 },
} as const satisfies Record<string, MaterialFinish>;

export type Finish = keyof typeof FINISHES;

export const OBJECTIVE_BANDS = {
  x4: { color: '#e5484d', metalness: 0.2, roughness: 0.45 },
  x10: { color: '#f5c451', metalness: 0.2, roughness: 0.45 },
  x40: { color: '#6cc4ff', metalness: 0.2, roughness: 0.45 },
  x100: { color: '#f2f4f7', metalness: 0.2, roughness: 0.45 },
} as const satisfies Record<string, MaterialFinish>;
