import { DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';
import { swatchOf } from './geometry/body/palette';
import type { Palette } from './geometry/body/palette';

export const PAINT = {
  body: THEME.carBody,
  trim: THEME.carTrim,
  frame: '#15171a',
  under: '#111214',
  glass: '#0b0f14',
  lampWhite: '#f2f6ff',
  lampRed: '#ff1010',
  lampRedLens: '#3a0507',
  mirror: '#c9d1da',
  seatShell: '#1b1d21',
  seatCushion: '#4a4d55',
  harness: '#a3392f',
  buckle: '#b9bec5',
  dash: '#24262b',
  screen: '#0d1a29',
  screenGlow: '#3b74ad',
  tub: '#25272c',
  liner: '#3a3d44',
} as const;

const PAINT_REFLECTION = 1.8;
const GLASS_REFLECTION = 2.6;
const TRIM_REFLECTION = 1.2;
const MATTE_REFLECTION = 0.4;
const GHOST_OPACITY = 0.12;
const GLASS_OPACITY = 0.82;

function satin(color: string, roughness: number, metalness = 0.1): MaterialFinish {
  return { color, roughness, metalness, envMapIntensity: TRIM_REFLECTION };
}

function matte(color: string, roughness = 0.9): MaterialFinish {
  return { color, roughness, metalness: 0, envMapIntensity: MATTE_REFLECTION };
}

function lamp(color: string, glow: string, intensity: number): MaterialFinish {
  return {
    color,
    emissive: glow,
    emissiveIntensity: intensity,
    roughness: 0.25,
    metalness: 0,
    envMapIntensity: TRIM_REFLECTION,
  };
}

export const BODY_FINISHES = {
  paint: {
    color: PAINT.body,
    roughness: 0.28,
    metalness: 0.35,
    envMapIntensity: PAINT_REFLECTION,
    side: DoubleSide,
  },
  frame: { ...satin(PAINT.frame, 0.18, 0.3), envMapIntensity: PAINT_REFLECTION },
  trim: satin(PAINT.trim, 0.55, 0.15),
  under: { ...matte(PAINT.under, 0.85), side: DoubleSide },
  glass: {
    color: PAINT.glass,
    roughness: 0.04,
    metalness: 0.5,
    envMapIntensity: GLASS_REFLECTION,
    transparent: true,
    opacity: GLASS_OPACITY,
    side: DoubleSide,
  },
  ghost: {
    color: PAINT.body,
    roughness: 0.35,
    metalness: 0.1,
    envMapIntensity: PAINT_REFLECTION,
    transparent: true,
    opacity: GHOST_OPACITY,
    depthWrite: false,
    side: DoubleSide,
  },
  lampFront: lamp(PAINT.lampWhite, PAINT.lampWhite, 2.4),
  lampRear: lamp(PAINT.lampRedLens, PAINT.lampRed, 1.3),
  mirror: { color: PAINT.mirror, roughness: 0.04, metalness: 1, envMapIntensity: GLASS_REFLECTION },
} as const satisfies Record<string, MaterialFinish>;

export const CABIN_FINISHES = {
  seatShell: satin(PAINT.seatShell, 0.42, 0.25),
  seatCushion: matte(PAINT.seatCushion, 0.95),
  harness: matte(PAINT.harness, 0.85),
  buckle: { ...satin(PAINT.buckle, 0.3, 0.9), envMapIntensity: PAINT_REFLECTION },
  dash: satin(PAINT.dash, 0.6, 0.05),
  screen: lamp(PAINT.screen, PAINT.screenGlow, 0.6),
  tub: matte(PAINT.tub, 0.9),
  liner: matte(PAINT.liner, 0.85),
} as const satisfies Record<string, MaterialFinish>;

export const CAR_SWATCHES = {
  paint: swatchOf(BODY_FINISHES.paint),
  frame: swatchOf(BODY_FINISHES.frame),
  trim: swatchOf(BODY_FINISHES.trim),
  under: swatchOf(BODY_FINISHES.under),
  mirror: swatchOf(BODY_FINISHES.mirror),
  lampFront: swatchOf(BODY_FINISHES.lampFront),
  lampRear: swatchOf(BODY_FINISHES.lampRear),
  seatShell: swatchOf(CABIN_FINISHES.seatShell),
  seatCushion: swatchOf(CABIN_FINISHES.seatCushion),
  harness: swatchOf(CABIN_FINISHES.harness),
  buckle: swatchOf(CABIN_FINISHES.buckle),
  dash: swatchOf(CABIN_FINISHES.dash),
  screen: swatchOf(CABIN_FINISHES.screen),
  tub: swatchOf(CABIN_FINISHES.tub),
  liner: swatchOf(CABIN_FINISHES.liner),
} as const;

export type CarSwatch = keyof typeof CAR_SWATCHES;

export function paletteFinish(palette: Palette<CarSwatch>): MaterialFinish {
  return {
    color: '#ffffff',
    map: palette.color,
    roughness: 1,
    roughnessMap: palette.surface,
    metalness: 1,
    metalnessMap: palette.surface,
    aoMap: palette.surface,
    emissive: '#ffffff',
    emissiveMap: palette.glow,
    emissiveIntensity: palette.glowIntensity,
    envMapIntensity: palette.reflection,
    side: DoubleSide,
  };
}
