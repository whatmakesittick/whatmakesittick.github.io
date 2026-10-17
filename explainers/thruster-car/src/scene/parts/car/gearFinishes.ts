import { BackSide, Color } from 'three';
import type { Texture } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { NozzlePartId } from '../../../ids';
import { THEME } from '../../../theme';

export const GEAR_PAINT = {
  vertexBase: '#ffffff',
  nozzleBody: THEME.nozzleBody,
  graphite: '#2e3136',
  rimHub: '#26292d',
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

const CHROME_REFLECTION = 1.5;
const METAL_REFLECTION = 1.1;
const PAINT_REFLECTION = 1.2;
const GLASS_REFLECTION = 0.7;
const GHOST_REFLECTION = 0.5;
const BLUR_REFLECTION = 0.6;
const SHEEN_REFLECTION = 0.35;
const RUBBER_REFLECTION = 0.25;
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
  liner: {
    ...satin(GEAR_PAINT.liner, 0.85, 0),
    envMapIntensity: LINER_REFLECTION,
    side: BackSide,
  },
  needle: satin(GEAR_PAINT.needle, 0.4),
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

export interface ReflectiveFinishes {
  rimGraphite: MaterialFinish;
  rimHub: MaterialFinish;
  caliper: MaterialFinish;
  tankGhost: MaterialFinish;
  tankMounts: MaterialFinish;
  valveMetal: MaterialFinish;
  nozzleBody: MaterialFinish;
}

const reflectiveCache = new WeakMap<Texture, ReflectiveFinishes>();

function reflecting(
  finish: MaterialFinish,
  envMap: Texture,
  envMapIntensity: number,
): MaterialFinish {
  return { ...finish, envMap, envMapIntensity };
}

function buildReflective(env: Texture): ReflectiveFinishes {
  const ghost = {
    ...satin(THEME.tankShell, 0.3, 0.2),
    transparent: true,
    opacity: GHOST_OPACITY,
    depthWrite: false,
  };
  return {
    rimGraphite: reflecting(metal(GEAR_PAINT.graphite, 0.36, 0.75), env, METAL_REFLECTION),
    rimHub: reflecting(tintedMetal(0.3, 0.85), env, CHROME_REFLECTION),
    caliper: reflecting(metal(GEAR_PAINT.caliper, 0.4, 0.65), env, METAL_REFLECTION),
    tankGhost: reflecting(ghost, env, GHOST_REFLECTION),
    tankMounts: reflecting(tintedMetal(0.38, 0.75), env, METAL_REFLECTION),
    valveMetal: reflecting(tintedMetal(0.28, 0.85), env, CHROME_REFLECTION),
    nozzleBody: reflecting(tintedMetal(0.36, 0.7), env, METAL_REFLECTION),
  };
}

export function reflectiveFinishes(env: Texture): ReflectiveFinishes {
  let finishes = reflectiveCache.get(env);
  if (!finishes) {
    finishes = buildReflective(env);
    reflectiveCache.set(env, finishes);
  }
  return finishes;
}

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

export function rotorFinish(slots: Texture, env: Texture): MaterialFinish {
  return { ...reflecting(metal(GEAR_PAINT.rotor, 0.45, 0.8), env, METAL_REFLECTION), map: slots };
}

export function rimBlurFinish(blur: Texture, env: Texture): MaterialFinish {
  return {
    ...reflecting(metal(GEAR_PAINT.blur, 0.5, 0.45), env, BLUR_REFLECTION),
    map: blur,
    transparent: true,
    depthWrite: false,
  };
}

export function shellFinish(winding: Texture, env: Texture): MaterialFinish {
  return {
    color: THEME.tankShell,
    map: winding,
    bumpMap: winding,
    bumpScale: SHELL_BUMP_SCALE,
    metalness: 0.1,
    roughness: 0.42,
    envMap: env,
    envMapIntensity: SHEEN_REFLECTION,
  };
}

export function braidFinish(braid: Texture, env: Texture): MaterialFinish {
  return {
    ...reflecting(metal(GEAR_PAINT.braid, 0.42, 0.8), env, METAL_REFLECTION),
    map: braid,
    bumpMap: braid,
    bumpScale: BUMP_SCALE,
  };
}

export function dialFinish(dial: Texture, env: Texture): MaterialFinish {
  return { ...reflecting(satin(GEAR_PAINT.dial, 0.16, 0), env, GLASS_REFLECTION), map: dial };
}
