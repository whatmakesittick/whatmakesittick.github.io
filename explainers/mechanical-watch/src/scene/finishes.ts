import { MeshPhysicalMaterial } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';

const METAL_REFLECTION = 1.7;
const POLISH_REFLECTION = 2.2;
const RUBY_GLOW = 0.45;
const ENERGY_GLOW = 0.9;

export const PAINT = {
  brass: THEME.brass,
  plate: '#d3bd8c',
  paleBrass: '#e6cf96',
  steel: '#cdd2d8',
  brightSteel: '#e4e8ec',
  darkSteel: '#9aa2ab',
  blued: THEME.bluedSteel,
  ruby: THEME.ruby,
  rubyGlow: '#6b0a22',
  glucydur: '#d9a877',
  dial: THEME.dialFace,
  print: '#1d2127',
  case: '#dfe3e8',
  energy: THEME.energy,
  energyCore: '#ffa726',
  energyGlow: '#ff8f00',
} as const;

export const FINISHES = {
  brass: {
    color: PAINT.brass,
    metalness: 0.75,
    roughness: 0.3,
    envMapIntensity: METAL_REFLECTION,
  },
  polishedBrass: {
    color: PAINT.paleBrass,
    metalness: 0.85,
    roughness: 0.16,
    envMapIntensity: POLISH_REFLECTION,
  },
  steel: {
    color: PAINT.steel,
    metalness: 0.9,
    roughness: 0.22,
    envMapIntensity: METAL_REFLECTION,
  },
  brightSteel: {
    color: PAINT.brightSteel,
    metalness: 0.95,
    roughness: 0.14,
    envMapIntensity: POLISH_REFLECTION,
  },
  blued: {
    color: PAINT.blued,
    metalness: 0.8,
    roughness: 0.26,
    envMapIntensity: METAL_REFLECTION,
  },
  glucydur: {
    color: PAINT.glucydur,
    metalness: 0.85,
    roughness: 0.24,
    envMapIntensity: METAL_REFLECTION,
  },
  case: {
    color: PAINT.case,
    metalness: 1,
    roughness: 0.12,
    envMapIntensity: POLISH_REFLECTION,
  },
  plate: {
    color: PAINT.plate,
    metalness: 0.72,
    roughness: 0.36,
    envMapIntensity: METAL_REFLECTION,
  },
  dialMarker: {
    color: PAINT.brightSteel,
    metalness: 0.9,
    roughness: 0.24,
    envMapIntensity: POLISH_REFLECTION,
  },
  energy: {
    color: PAINT.energyCore,
    emissive: PAINT.energyGlow,
    emissiveIntensity: ENERGY_GLOW,
    metalness: 0,
    roughness: 0.4,
  },
} as const satisfies Record<string, MaterialFinish>;

export type Finish = keyof typeof FINISHES;

export function rubyMaterial(vertexColors = false): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: vertexColors ? '#ffffff' : PAINT.ruby,
    vertexColors,
    metalness: 0,
    roughness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    ior: 1.77,
    specularIntensity: 1,
    emissive: PAINT.rubyGlow,
    emissiveIntensity: RUBY_GLOW,
  });
}
