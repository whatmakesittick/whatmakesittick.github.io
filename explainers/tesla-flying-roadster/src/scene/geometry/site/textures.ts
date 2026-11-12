import { Color, NoColorSpace, SRGBColorSpace } from 'three';
import type { DataTexture } from 'three';
import { paintPixels, pixelTexture } from '../gear/maps';
import type { MapSize, Painter, Rgba } from '../gear/maps';

export type Rgb = readonly [r: number, g: number, b: number];
export type { Painter, Rgba };
export type HeightField = (u: number, v: number) => number;

export interface TextureSize {
  width: number;
  height: number;
}

const OPAQUE = 1;
const ANISOTROPY = 8;

export function srgb(hex: string): Rgb {
  const { r, g, b } = new Color(hex).getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace);
  return [r, g, b];
}

export function mixRgb(from: Rgb, to: Rgb, share: number): Rgb {
  return [
    from[0] + (to[0] - from[0]) * share,
    from[1] + (to[1] - from[1]) * share,
    from[2] + (to[2] - from[2]) * share,
  ];
}

export function shade(colour: Rgb, factor: number, alpha = OPAQUE): Rgba {
  return [colour[0] * factor, colour[1] * factor, colour[2] * factor, alpha];
}

export function band(value: number, centre: number, width: number): number {
  return Math.exp(-(((value - centre) / width) ** 2));
}

export interface TextureRecipe {
  size: MapSize;
  normal?: boolean;
  paint(): Painter;
  finish?(texture: DataTexture): void;
}

export function painted(
  size: TextureSize,
  painter: Painter,
  options: { repeat?: boolean; finish?: TextureRecipe['finish'] } = {},
): TextureRecipe {
  const { repeat = true, finish } = options;
  return { size: { ...size, repeat }, paint: () => painter, finish };
}

export function recipePixels(recipe: TextureRecipe): Uint8Array {
  return paintPixels(recipe.size, recipe.paint());
}

export function recipeTexture(recipe: TextureRecipe, pixels: Uint8Array): DataTexture {
  const texture = pixelTexture(recipe.size, pixels);
  texture.anisotropy = ANISOTROPY;
  if (recipe.normal) texture.colorSpace = NoColorSpace;
  recipe.finish?.(texture);
  return texture;
}

function sampleHeights(size: TextureSize, field: HeightField): Float32Array {
  const { width, height } = size;
  const heights = new Float32Array(width * height);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      heights[row * width + column] = field((column + 0.5) / width, (row + 0.5) / height);
    }
  }
  return heights;
}

export function normalPainter(size: TextureSize, field: HeightField, strength: number): Painter {
  const { width, height } = size;
  const heights = sampleHeights(size, field);
  const at = (column: number, row: number) =>
    heights[((row + height) % height) * width + ((column + width) % width)];
  return (u, v) => {
    const column = Math.floor(u * width);
    const row = Math.floor(v * height);
    const dx = (at(column + 1, row) - at(column - 1, row)) * strength;
    const dy = (at(column, row + 1) - at(column, row - 1)) * strength;
    const length = Math.hypot(dx, dy, 1);
    return [(-dx / length) * 0.5 + 0.5, (-dy / length) * 0.5 + 0.5, 0.5 / length + 0.5, OPAQUE];
  };
}

export function normalRecipe(
  size: TextureSize,
  field: HeightField,
  strength: number,
  finish: TextureRecipe['finish'],
): TextureRecipe {
  return {
    size: { ...size, repeat: true },
    normal: true,
    paint: () => normalPainter(size, field, strength),
    finish,
  };
}
