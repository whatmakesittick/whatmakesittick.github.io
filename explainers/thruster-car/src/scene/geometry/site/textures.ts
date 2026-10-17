import {
  Color,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { clamp } from '@core/math';

export type Rgb = readonly [r: number, g: number, b: number];
export type Rgba = readonly [r: number, g: number, b: number, a: number];
export type Painter = (u: number, v: number) => Rgba;
export type HeightField = (u: number, v: number) => number;

export interface TextureSize {
  width: number;
  height: number;
}

const CHANNELS = 4;
const BYTE = 255;
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

function encode(size: TextureSize, painter: Painter): Uint8Array {
  const { width, height } = size;
  const pixels = new Uint8Array(width * height * CHANNELS);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const colour = painter((column + 0.5) / width, (row + 0.5) / height);
      const offset = (row * width + column) * CHANNELS;
      for (let channel = 0; channel < CHANNELS; channel += 1) {
        pixels[offset + channel] = Math.round(clamp(colour[channel], 0, 1) * BYTE);
      }
    }
  }
  return pixels;
}

function dataTexture(size: TextureSize, pixels: Uint8Array, colour: boolean): DataTexture {
  const texture = new DataTexture(pixels, size.width, size.height, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = ANISOTROPY;
  texture.colorSpace = colour ? SRGBColorSpace : NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function paintTexture(size: TextureSize, painter: Painter): DataTexture {
  return dataTexture(size, encode(size, painter), true);
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

export function normalTexture(
  size: TextureSize,
  field: HeightField,
  strength: number,
): DataTexture {
  return dataTexture(size, encode(size, normalPainter(size, field, strength)), false);
}
