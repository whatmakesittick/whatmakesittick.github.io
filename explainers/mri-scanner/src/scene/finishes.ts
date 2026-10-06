import { DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { THEME } from '../theme';

export const PAINT = {
  floor: THEME.floor,
  ceiling: THEME.ceiling,
  copper: THEME.copper,
  copperDark: THEME.copperDark,
  windowGlass: THEME.windowGlass,
  consoleGlow: THEME.consoleGlow,
  screenFrame: THEME.screenFrame,
  table: THEME.table,
  cradle: THEME.cradle,
  blanket: THEME.blanket,
  skin: THEME.skin,
  headCoil: THEME.headCoil,
  copperSheet: '#9a5d3b',
  vinyl: '#6f6c67',
  shell: '#1d1f23',
  skirting: '#2e241c',
  frame: '#c9ced3',
  lightPanel: '#fbfcff',
  controlShell: '#1c2026',
  desk: '#2a2f36',
  bezel: '#121417',
  pedestal: '#bfc4ca',
  rail: '#5d646c',
  pad: '#3f4a57',
  gown: '#c9d6df',
  coilTrim: '#6d7782',
  picture: '#ffffff',
} as const;

const SOFT_REFLECTION = 0.35;
const METAL_REFLECTION = 0.8;
const GLASS_REFLECTION = 1.6;
const GLASS_SHEEN = 0.16;

function matte(color: string, roughness: number, metalness = 0): MaterialFinish {
  return { color, roughness, metalness, envMapIntensity: SOFT_REFLECTION };
}

function metal(color: string, roughness: number, metalness = 0.85): MaterialFinish {
  return { color, roughness, metalness, envMapIntensity: METAL_REFLECTION };
}

function glow(color: string, emissive: string, emissiveIntensity: number): MaterialFinish {
  return { ...matte(color, 0.6), emissive, emissiveIntensity };
}

export const FINISHES = {
  skirting: matte(PAINT.skirting, 0.7),
  ceiling: matte(PAINT.ceiling, 0.9),
  lightPanel: glow(PAINT.lightPanel, PAINT.lightPanel, 0.9),
  frame: metal(PAINT.frame, 0.35, 0.6),
  shell: matte(PAINT.shell, 0.85),
  glass: {
    ...matte(PAINT.windowGlass, 0.04, 0.3),
    envMapIntensity: GLASS_REFLECTION,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  },
  controlShell: matte(PAINT.controlShell, 0.95),
  desk: matte(PAINT.desk, 0.6, 0.2),
  bezel: matte(PAINT.bezel, 0.4, 0.3),
  screenFrame: matte(PAINT.screenFrame, 0.45, 0.3),
  pedestal: matte(PAINT.pedestal, 0.45, 0.1),
  table: matte(PAINT.table, 0.4, 0.05),
  rail: metal(PAINT.rail, 0.4),
  cradle: matte(PAINT.cradle, 0.35),
  pad: matte(PAINT.pad, 0.85),
  skin: matte(PAINT.skin, 0.65),
  gown: matte(PAINT.gown, 0.9),
  blanket: { ...matte(PAINT.blanket, 0.95), side: DoubleSide },
  headCoil: matte(PAINT.headCoil, 0.3, 0.05),
  coilTrim: matte(PAINT.coilTrim, 0.5, 0.2),
} as const satisfies Record<string, MaterialFinish>;

export function texturedFinish(base: MaterialFinish, map: MaterialFinish['map']): MaterialFinish {
  return { ...base, color: '#ffffff', map };
}

export function glowingFinish(map: MaterialFinish['emissiveMap'], intensity = 1): MaterialFinish {
  return {
    ...matte(PAINT.bezel, 0.3),
    emissive: PAINT.picture,
    emissiveMap: map,
    emissiveIntensity: intensity,
  };
}

export function sheenedGlass(map: MaterialFinish['emissiveMap']): MaterialFinish {
  return {
    ...FINISHES.glass,
    emissive: PAINT.picture,
    emissiveMap: map,
    emissiveIntensity: GLASS_SHEEN,
  };
}

export const SURFACE_LOOK = {
  floor: matte('#ffffff', 0.42),
  wall: matte('#ffffff', 0.42, 0.55),
  console: 0.85,
  picture: 1,
} as const;
