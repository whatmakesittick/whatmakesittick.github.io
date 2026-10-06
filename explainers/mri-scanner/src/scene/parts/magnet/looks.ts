import { CanvasTexture, Color, RepeatWrapping, SRGBColorSpace } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { GradientAxisId } from '../../../ids';
import { GRADIENT_AXIS_IDS } from '../../../ids';
import { GRADIENT_TONES, THEME } from '../../../theme';
import type { PartContext } from '../context';

const RESIN = '#262b31';
const RESIN_SHARE = 0.6;
const WIRE_TURNS_PER_TILE = 8;
const WIRE_TILE = { width: 16, height: 64 } as const;
const WIRE_TILES_PER_METRE = 18;
const WIRE_SHADES = { edge: 0.35, core: 1 } as const;
const CUT_WIRE = {
  roughness: 0.45,
  metalness: 0.35,
  bumpScale: 0.8,
  emissiveIntensity: 0.35,
} as const;
const CUT_COPPER = { main: '#ec8a45', shield: '#d9733a', glow: '#7a3412' } as const;

export const COVER_FINISH: MaterialFinish = {
  color: THEME.cover,
  roughness: 0.32,
  metalness: 0.04,
};
export const TRIM_FINISH: MaterialFinish = {
  color: THEME.coverTrim,
  roughness: 0.5,
  metalness: 0.08,
};
export const ACCENT_FINISH: MaterialFinish = {
  color: '#d6f0ff',
  emissive: '#7cc8ff',
  emissiveIntensity: 1.4,
  roughness: 0.3,
};
export const STEEL_FINISH: MaterialFinish = {
  color: '#646d78',
  roughness: 0.4,
  metalness: 0.45,
};
export const ALUMINIUM_FINISH: MaterialFinish = {
  color: '#f2f6fa',
  emissive: THEME.radiationShield,
  emissiveIntensity: 0.5,
  roughness: 0.22,
  metalness: 0.5,
};
export const HELIUM_STEEL_FINISH: MaterialFinish = {
  color: '#8796a8',
  roughness: 0.35,
  metalness: 0.5,
};
export const VACUUM_FINISH: MaterialFinish = { color: '#0b0e12', roughness: 0.95, metalness: 0 };
export const HELIUM_VAPOUR_FINISH: MaterialFinish = {
  color: '#2c6688',
  emissive: '#173f5a',
  emissiveIntensity: 0.7,
  roughness: 0.7,
  metalness: 0,
};
export const LIQUID_HELIUM_FINISH: MaterialFinish = {
  color: '#4dbdf0',
  emissive: '#1f8fd0',
  emissiveIntensity: 0.45,
  roughness: 0.25,
  metalness: 0,
};
export const SHIM_TRAY_FINISH: MaterialFinish = {
  color: '#8a9099',
  roughness: 0.5,
  metalness: 0.6,
};
export const SHIM_FINISH: MaterialFinish = { color: THEME.shim, roughness: 0.6, metalness: 0.55 };
export const COPPER_FINISH: MaterialFinish = {
  color: THEME.copper,
  roughness: 0.28,
  metalness: 0.9,
};
export const BODY_COIL_CUT_FINISH: MaterialFinish = {
  color: '#ffb35e',
  emissive: '#ff7a1f',
  emissiveIntensity: 0.8,
  roughness: 0.4,
  metalness: 0.2,
};
export const CAPACITOR_FINISH: MaterialFinish = { color: '#3b3f46', roughness: 0.55 };
export const LINER_FINISH: MaterialFinish = { color: THEME.boreLiner, roughness: 0.42 };
export const LINER_GLASS_FINISH: MaterialFinish = {
  ...LINER_FINISH,
  transparent: true,
  opacity: 0.25,
  depthWrite: false,
};
export const TURRET_FINISH: MaterialFinish = { color: '#aab2bb', roughness: 0.3, metalness: 0.85 };
export const PIPE_FINISH: MaterialFinish = { color: '#7d858f', roughness: 0.4, metalness: 0.8 };
export const HOSE_FINISH: MaterialFinish = { color: '#2b2f35', roughness: 0.75, metalness: 0.2 };

export const RESIN_FINISHES: Readonly<Record<GradientAxisId, MaterialFinish>> = Object.fromEntries(
  GRADIENT_AXIS_IDS.map((axis) => [
    axis,
    {
      color: new Color(GRADIENT_TONES[axis]).lerp(new Color(RESIN), RESIN_SHARE),
      roughness: 0.55,
      metalness: 0.15,
    },
  ]),
) as Record<GradientAxisId, MaterialFinish>;

const RESIN_GLASS_OPACITY = 0.22;

export const RESIN_GLASS_FINISHES: Readonly<Record<GradientAxisId, MaterialFinish>> =
  Object.fromEntries(
    GRADIENT_AXIS_IDS.map((axis) => [
      axis,
      {
        ...RESIN_FINISHES[axis],
        transparent: true,
        opacity: RESIN_GLASS_OPACITY,
        depthWrite: false,
      },
    ]),
  ) as Record<GradientAxisId, MaterialFinish>;

export interface MagnetLooks {
  winding: MaterialFinish;
  shieldWinding: MaterialFinish;
  windingCut: MaterialFinish;
  shieldWindingCut: MaterialFinish;
}

function windingTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = WIRE_TILE.width;
  canvas.height = WIRE_TILE.height;
  const context = canvas.getContext('2d');
  const turn = WIRE_TILE.height / WIRE_TURNS_PER_TILE;
  for (let index = 0; context && index < WIRE_TURNS_PER_TILE; index += 1) {
    const top = index * turn;
    const shade = context.createLinearGradient(0, top, 0, top + turn);
    const edge = Math.round(WIRE_SHADES.edge * 255);
    const core = Math.round(WIRE_SHADES.core * 255);
    shade.addColorStop(0, `rgb(${edge}, ${edge}, ${edge})`);
    shade.addColorStop(0.5, `rgb(${core}, ${core}, ${core})`);
    shade.addColorStop(1, `rgb(${edge}, ${edge}, ${edge})`);
    context.fillStyle = shade;
    context.fillRect(0, top, WIRE_TILE.width, turn);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1, WIRE_TILES_PER_METRE);
  return texture;
}

export function createMagnetLooks(context: PartContext): MagnetLooks {
  const wire = context.tracker.track(windingTexture());
  const wound = { roughness: 0.32, metalness: 0.85, map: wire, bumpMap: wire, bumpScale: 1.5 };
  const cut = { ...wound, ...CUT_WIRE };
  return {
    winding: { ...wound, color: THEME.winding },
    shieldWinding: { ...wound, color: THEME.shieldWinding },
    windingCut: { ...cut, color: CUT_COPPER.main, emissive: CUT_COPPER.glow },
    shieldWindingCut: { ...cut, color: CUT_COPPER.shield, emissive: CUT_COPPER.glow },
  };
}
