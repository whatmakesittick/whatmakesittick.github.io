import { Color, DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';

const PROTEIN_ROUGHNESS = 0.62;
const PROTEIN_REFLECTION = 0.7;
const GLASS_OPACITY = 0.2;
const CHANNEL_OPACITY = 0.42;
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
} as const;

export type MotorPaint = keyof typeof PAINT;

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

export function desaturate(hex: string, saturation: number, brightness: number): string {
  const color = new Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  return `#${color.setHSL(hsl.h, hsl.s * saturation, hsl.l * brightness).getHexString()}`;
}

export interface MotorFinishes {
  readonly ring: MaterialFinish;
  readonly carboxyl: MaterialFinish;
  readonly axle: MaterialFinish;
  readonly alpha: MaterialFinish;
  readonly beta: MaterialFinish;
  readonly alphaGlass: MaterialFinish;
  readonly betaGlass: MaterialFinish;
  readonly stator: MaterialFinish;
  readonly gate: MaterialFinish;
  readonly channel: MaterialFinish;
}

function motorFinishes(paint: (name: MotorPaint) => string): MotorFinishes {
  const alpha = protein(paint('alpha'));
  const beta = protein(paint('beta'));
  return {
    ring: protein(paint('ring')),
    carboxyl: protein(paint('carboxyl')),
    axle: protein(paint('axle')),
    alpha,
    beta,
    alphaGlass: glass(alpha, GLASS_OPACITY),
    betaGlass: glass(beta, GLASS_OPACITY),
    stator: protein(paint('stator')),
    gate: protein(paint('gate')),
    channel: { ...glass(protein(paint('channel')), CHANNEL_OPACITY), side: DoubleSide },
  };
}

export const HERO_FINISHES = motorFinishes((name) => PAINT[name]);

export const ROW_FINISHES = motorFinishes((name) =>
  desaturate(PAINT[name], ROW_SATURATION, ROW_BRIGHTNESS),
);
