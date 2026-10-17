import { DoubleSide } from 'three';
import type { Texture } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { Palette, Swatch } from '../../geometry/body/palette';
import type { RowSwatch } from '../../geometry/row/swatch';

const PAINT_REFLECTION = 1.6;
const GLASS_REFLECTION = 1.8;
const METAL_REFLECTION = 1.6;
const SATIN_REFLECTION = 0.8;
const MATTE_REFLECTION = 0.25;

function paint(color: string): Swatch {
  return { color, roughness: 0.3, metalness: 0.35, reflection: PAINT_REFLECTION };
}

function matte(color: string, roughness = 0.9): Swatch {
  return { color, roughness, metalness: 0, reflection: MATTE_REFLECTION };
}

function lens(color: string, glow: string, intensity: number): Swatch {
  return {
    color,
    roughness: 0.12,
    metalness: 0.2,
    reflection: PAINT_REFLECTION,
    glow: { color: glow, intensity },
  };
}

export const ROW_SWATCHES: Readonly<Record<RowSwatch, Swatch>> = {
  paintSlate: paint('#2a3644'),
  paintCharcoal: paint('#29292c'),
  paintMoss: paint('#2c3731'),
  paintOxblood: paint('#4a191c'),
  trim: { color: '#141517', roughness: 0.55, metalness: 0.1, reflection: SATIN_REFLECTION },
  seam: matte('#060607'),
  under: matte('#0d0e0f'),
  glass: { color: '#0a0e13', roughness: 0.04, metalness: 0.6, reflection: GLASS_REFLECTION },
  grille: { color: '#0f1012', roughness: 0.6, metalness: 0.2, reflection: SATIN_REFLECTION },
  chrome: { color: '#b4bac1', roughness: 0.22, metalness: 0.95, reflection: METAL_REFLECTION },
  steel: { color: '#2c2e31', roughness: 0.5, metalness: 0.6, reflection: SATIN_REFLECTION },
  tyre: matte('#19191a', 0.92),
  rim: { color: '#8a9097', roughness: 0.35, metalness: 0.85, reflection: METAL_REFLECTION },
  rimDark: matte('#121315', 0.7),
  lampHead: { color: '#7f8892', roughness: 0.08, metalness: 0.5, reflection: GLASS_REFLECTION },
  lampRear: lens('#3a0608', '#7a0d0d', 0.35),
  lampAmber: lens('#4f2c06', '#a8560c', 0.25),
  plate: { color: '#9aa0a6', roughness: 0.5, metalness: 0.1, reflection: SATIN_REFLECTION },
};

export function rowFinish(palette: Palette<RowSwatch>, environment: Texture): MaterialFinish {
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
    envMap: environment,
    envMapIntensity: palette.reflection,
    side: DoubleSide,
  };
}
