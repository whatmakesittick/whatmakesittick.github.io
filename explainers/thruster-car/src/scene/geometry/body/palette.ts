import {
  Color,
  DataTexture,
  Float32BufferAttribute,
  NearestFilter,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from 'three';
import type { BufferGeometry, ColorRepresentation, RGB } from 'three';
import type { MaterialFinish } from '@core/scene/materials';

export interface Swatch {
  color: ColorRepresentation;
  roughness: number;
  metalness: number;
  reflection: number;
  glow?: { color: ColorRepresentation; intensity: number };
}

export interface Palette<K extends string> {
  readonly color: DataTexture;
  readonly surface: DataTexture;
  readonly glow: DataTexture;
  readonly reflection: number;
  readonly glowIntensity: number;
  readonly textures: readonly DataTexture[];
  uv(key: K): readonly [u: number, v: number];
  paint(geometry: BufferGeometry, key: K): BufferGeometry;
}

const FULL = 255;
const ROW_V = 0.5;
const UV_SIZE = 2;

export function swatchOf(finish: MaterialFinish): Swatch {
  const { color = '#ffffff', roughness = 1, metalness = 0, envMapIntensity = 1 } = finish;
  const swatch: Swatch = { color, roughness, metalness, reflection: envMapIntensity };
  if (finish.emissive === undefined) return swatch;
  return { ...swatch, glow: { color: finish.emissive, intensity: finish.emissiveIntensity ?? 1 } };
}

function bytes(rgb: RGB, alpha = 1): number[] {
  return [rgb.r, rgb.g, rgb.b, alpha].map((value) =>
    Math.round(FULL * Math.min(1, Math.max(0, value))),
  );
}

function srgb(color: Color): RGB {
  return color.getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace);
}

function strip(texels: readonly number[][], colour: boolean): DataTexture {
  const texture = new DataTexture(
    new Uint8Array(texels.flat()),
    texels.length,
    1,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  if (colour) texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createPalette<K extends string>(swatches: Readonly<Record<K, Swatch>>): Palette<K> {
  const keys = Object.keys(swatches) as K[];
  const entries = keys.map((key) => swatches[key]);
  const reflection = Math.max(...entries.map((entry) => entry.reflection));
  const glowIntensity = Math.max(0, ...entries.map((entry) => entry.glow?.intensity ?? 0));
  const glowOf = (entry: Swatch): RGB => {
    if (!entry.glow || glowIntensity === 0) return { r: 0, g: 0, b: 0 };
    return srgb(new Color(entry.glow.color).multiplyScalar(entry.glow.intensity / glowIntensity));
  };
  const color = strip(
    entries.map((entry) => bytes(srgb(new Color(entry.color)))),
    true,
  );
  const surface = strip(
    entries.map((entry) =>
      bytes({ r: entry.reflection / reflection, g: entry.roughness, b: entry.metalness }),
    ),
    false,
  );
  const glow = strip(
    entries.map((entry) => bytes(glowOf(entry))),
    true,
  );
  const uv = (key: K): readonly [number, number] => [
    (keys.indexOf(key) + ROW_V) / keys.length,
    ROW_V,
  ];
  const paint = (geometry: BufferGeometry, key: K): BufferGeometry => {
    const [u, v] = uv(key);
    const count = geometry.getAttribute('position').count;
    const values = new Float32Array(count * UV_SIZE);
    for (let vertex = 0; vertex < count; vertex += 1) {
      values[vertex * UV_SIZE] = u;
      values[vertex * UV_SIZE + 1] = v;
    }
    geometry.setAttribute('uv', new Float32BufferAttribute(values, UV_SIZE));
    return geometry;
  };
  return {
    color,
    surface,
    glow,
    reflection,
    glowIntensity,
    textures: [color, surface, glow],
    uv,
    paint,
  };
}
