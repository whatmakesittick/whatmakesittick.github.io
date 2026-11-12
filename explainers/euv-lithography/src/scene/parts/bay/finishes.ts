import { Color, MeshBasicMaterial } from 'three';
import { activeScheme } from '@core/theme';
import type { Scheme } from '@core/theme';
import type { MaterialFinish } from '@core/scene/materials';
import { BAY_TONES } from '../../../theme';

export interface GlowLook {
  strip: number;
  pool: number;
  halo: number;
  lamp: number;
}

const GLOW_LOOKS: Readonly<Record<Scheme, GlowLook>> = {
  dark: { strip: 2.6, pool: 0.26, halo: 0.45, lamp: 1.5 },
  light: { strip: 1.4, pool: 0.05, halo: 0.25, lamp: 1.2 },
};

export const GLOW: GlowLook = GLOW_LOOKS[activeScheme()];

export const LAMP_TONES = {
  run: '#5cff8f',
  idle: '#ffb547',
  alarm: '#ff5b4a',
  info: '#6aa8ff',
  off: '#2c2a27',
} as const;

export const SUBFAB_FINISH: MaterialFinish = {
  color: BAY_TONES.subfab,
  roughness: 0.85,
  metalness: 0,
};

export function bakedMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
}

export function glowColour(hex: string, strength: number): Color {
  return new Color(hex).multiplyScalar(strength);
}
