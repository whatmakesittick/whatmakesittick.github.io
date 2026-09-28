import { Color, DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { SiteState } from '../ids';
import { THEME } from '../theme';

const PROTEIN_ROUGHNESS = 0.62;
const PROTEIN_REFLECTION = 0.7;
const GLASS_OPACITY = 0.24;
const GLASS_GLOW = 0.35;
const CHANNEL_OPACITY = 0.42;
const SEAT_GLOW = 1.1;
const BEAD_GLOW = 0.9;
const GLOW_BODY = 0.55;
const MOLECULE_GLOW = 0.35;
const BEAD_ROUGHNESS = 0.4;
const ROW_SATURATION = 0.55;
const ROW_BRIGHTNESS = 0.92;

export const PAINT = {
  ring: THEME.rotor,
  carboxyl: '#3b2a4a',
  axle: THEME.axle,
  alpha: THEME.alpha,
  beta: THEME.beta,
  stator: THEME.stator,
  gate: THEME.gate,
  channel: '#e3d4ff',
  pump: THEME.pump,
  hydrogen: '#eef2f8',
} as const;

export type MotorPaint = 'ring' | 'carboxyl' | 'axle' | 'alpha' | 'beta' | 'stator' | 'gate';

function protein(color: string): MaterialFinish {
  return {
    color,
    metalness: 0,
    roughness: PROTEIN_ROUGHNESS,
    envMapIntensity: PROTEIN_REFLECTION,
  };
}

function glass(finish: MaterialFinish, opacity: number): MaterialFinish {
  return { ...finish, transparent: true, opacity, depthWrite: false };
}

function tintedGlass(finish: MaterialFinish, tint: string): MaterialFinish {
  return { ...glass(finish, GLASS_OPACITY), emissive: tint, emissiveIntensity: GLASS_GLOW };
}

function glowing(color: string, emissiveIntensity: number): MaterialFinish {
  return {
    color: desaturate(color, 1, GLOW_BODY),
    emissive: color,
    emissiveIntensity,
    metalness: 0,
    roughness: BEAD_ROUGHNESS,
  };
}

export function desaturate(hex: string, saturation: number, brightness: number): string {
  const color = new Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  return `#${color.setHSL(hsl.h, hsl.s * saturation, hsl.l * brightness).getHexString()}`;
}

const alpha = protein(PAINT.alpha);
const beta = protein(PAINT.beta);

export const FINISHES = {
  ring: protein(PAINT.ring),
  carboxyl: protein(PAINT.carboxyl),
  axle: protein(PAINT.axle),
  alpha,
  beta,
  alphaGlass: tintedGlass(alpha, PAINT.alpha),
  betaGlass: tintedGlass(beta, PAINT.beta),
  stator: protein(PAINT.stator),
  gate: protein(PAINT.gate),
  channel: { ...glass(protein(PAINT.channel), CHANNEL_OPACITY), side: DoubleSide },
  pump: protein(PAINT.pump),
  blur: glass(protein(PAINT.ring), 0),
  blurredCarboxyl: glass(protein(PAINT.carboxyl), 0),
  blurredProtons: glass(glowing(THEME.proton, BEAD_GLOW), 0),
  proton: glowing(THEME.proton, BEAD_GLOW),
  electron: glowing(THEME.electron, BEAD_GLOW),
  oxygen: protein(THEME.oxygen),
  hydrogen: protein(PAINT.hydrogen),
  adenosine: protein(THEME.adp),
  atp: glowing(THEME.atp, MOLECULE_GLOW),
  phosphate: glowing(THEME.phosphate, MOLECULE_GLOW),
  row: { color: '#ffffff', vertexColors: true, metalness: 0, roughness: PROTEIN_ROUGHNESS },
} as const satisfies Record<string, MaterialFinish>;

export const SEAT_FINISHES: Readonly<Record<SiteState, MaterialFinish>> = {
  open: glowing(THEME.open, SEAT_GLOW),
  loose: glowing(THEME.loose, SEAT_GLOW),
  tight: glowing(THEME.tight, SEAT_GLOW),
};

export function rowPaint(paint: MotorPaint): string {
  return desaturate(PAINT[paint], ROW_SATURATION, ROW_BRIGHTNESS);
}
