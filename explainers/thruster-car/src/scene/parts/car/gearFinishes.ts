import { BackSide, Color } from 'three';
import type { Texture } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { NozzlePartId } from '../../../ids';
import { THEME } from '../../../theme';

export const GEAR_PAINT = {
  vertexBase: '#ffffff',
  nozzleBody: THEME.nozzleBody,
  graphite: '#2e3136',
  rimInner: '#1a1c1f',
  blur: '#4a4e55',
  machined: '#c9ced4',
  rotor: '#75787c',
  caliper: '#5b6067',
  liner: '#4b5058',
  strap: '#aab0b8',
  bracket: '#3b3f45',
  pad: '#1d1e21',
  aluminium: '#c3c8ce',
  bonnet: '#8d949c',
  knob: '#1d1f23',
  dial: '#ffffff',
  needle: '#d23b30',
  braid: '#a3a9b0',
  brass: '#b8925a',
  collar: '#8d939a',
  frost: '#6f7a85',
  frostGlow: '#9cc8ff',
} as const;

const METAL_REFLECTION = 1.4;
const PAINT_REFLECTION = 1.2;
const RUBBER_REFLECTION = 0.4;
const GLOW_REFLECTION = 0.15;
const GLOW_BODY_SHARE = 0.15;
const LINER_REFLECTION = 0.3;
const GLOW_OPACITY = 0.5;
const GHOST_OPACITY = 0.14;
const CONE_OPACITY = 0.5;
const BUMP_SCALE = 0.6;
const SHELL_BUMP_SCALE = 0.25;

function metal(color: string, roughness: number, metalness = 0.85): MaterialFinish {
  return { color, metalness, roughness, envMapIntensity: METAL_REFLECTION };
}

function tintedMetal(roughness: number, metalness: number): MaterialFinish {
  return { ...metal(GEAR_PAINT.vertexBase, roughness, metalness), vertexColors: true };
}

function satin(color: string, roughness: number, metalness = 0.15): MaterialFinish {
  return { color, metalness, roughness, envMapIntensity: PAINT_REFLECTION };
}

function glowing(color: string, emissiveIntensity: number, opacity: number): MaterialFinish {
  return {
    color: new Color(color).multiplyScalar(GLOW_BODY_SHARE),
    emissive: color,
    emissiveIntensity,
    metalness: 0,
    roughness: 0.8,
    envMapIntensity: GLOW_REFLECTION,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
  };
}

export const GEAR_FINISHES = {
  rimGraphite: metal(GEAR_PAINT.graphite, 0.38, 0.7),
  rimHub: tintedMetal(0.4, 0.8),
  caliper: metal(GEAR_PAINT.caliper, 0.42, 0.6),
  liner: {
    ...satin(GEAR_PAINT.liner, 0.85, 0),
    envMapIntensity: LINER_REFLECTION,
    side: BackSide,
  },
  tankGhost: {
    ...satin(THEME.tankShell, 0.3, 0.2),
    transparent: true,
    opacity: GHOST_OPACITY,
    depthWrite: false,
  },
  tankMounts: tintedMetal(0.42, 0.7),
  valveMetal: tintedMetal(0.32, 0.85),
  needle: satin(GEAR_PAINT.needle, 0.4),
  nozzleBody: tintedMetal(0.38, 0.65),
  frost: {
    color: GEAR_PAINT.frost,
    emissive: GEAR_PAINT.frostGlow,
    emissiveIntensity: 0.08,
    metalness: 0,
    roughness: 0.95,
    envMapIntensity: RUBBER_REFLECTION,
  },
  corePressure: glowing(THEME.pressure, 0.7, GLOW_OPACITY),
  coreEmpty: glowing(THEME.empty, 0.7, GLOW_OPACITY),
} as const satisfies Record<string, MaterialFinish>;

export const CONE_FINISHES: Readonly<Record<NozzlePartId, MaterialFinish>> = {
  cornerNozzles: { ...glowing(THEME.flip, 0.6, CONE_OPACITY), depthTest: false },
  frontNozzles: glowing(THEME.ramp, 0.6, CONE_OPACITY),
  rearNozzles: glowing(THEME.boost, 0.6, CONE_OPACITY),
};

export function tyreFinish(tread: Texture): MaterialFinish {
  return {
    color: THEME.tyre,
    map: tread,
    bumpMap: tread,
    bumpScale: BUMP_SCALE,
    metalness: 0,
    roughness: 0.9,
    envMapIntensity: RUBBER_REFLECTION,
  };
}

export function rotorFinish(slots: Texture): MaterialFinish {
  return { ...metal(GEAR_PAINT.rotor, 0.48, 0.8), map: slots };
}

export function rimBlurFinish(blur: Texture): MaterialFinish {
  return {
    ...metal(GEAR_PAINT.blur, 0.5, 0.45),
    map: blur,
    transparent: true,
    depthWrite: false,
  };
}

export function shellFinish(winding: Texture): MaterialFinish {
  return {
    color: THEME.tankShell,
    map: winding,
    bumpMap: winding,
    bumpScale: SHELL_BUMP_SCALE,
    metalness: 0.25,
    roughness: 0.3,
    envMapIntensity: PAINT_REFLECTION,
  };
}

export function braidFinish(braid: Texture): MaterialFinish {
  return {
    ...metal(GEAR_PAINT.braid, 0.42, 0.8),
    map: braid,
    bumpMap: braid,
    bumpScale: BUMP_SCALE,
  };
}

export function dialFinish(dial: Texture): MaterialFinish {
  return { ...satin(GEAR_PAINT.dial, 0.4, 0), map: dial };
}
