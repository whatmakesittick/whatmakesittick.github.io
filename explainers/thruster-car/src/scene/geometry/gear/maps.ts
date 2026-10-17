import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { clamp, smoothstep } from '@core/math';

export type Rgba = readonly [r: number, g: number, b: number, a: number];
export type Painter = (u: number, v: number) => Rgba;

export interface MapSize {
  width: number;
  height: number;
  repeat?: boolean;
}

const CHANNELS = 4;
const BYTE = 255;
const OPAQUE = 1;
const HASH_A = 127.1;
const HASH_B = 311.7;
const HASH_SCALE = 43758.5453;

export function grey(shade: number, alpha = OPAQUE): Rgba {
  return [shade, shade, shade, alpha];
}

export function ridge(value: number, centre: number, halfWidth: number, soft: number): number {
  const distance = Math.abs(value - centre);
  return 1 - smoothstep(distance, halfWidth, halfWidth + soft);
}

export function seamDistance(value: number): number {
  const share = value - Math.floor(value);
  return Math.min(share, 1 - share);
}

export function hash(x: number, y: number): number {
  const value = Math.sin(x * HASH_A + y * HASH_B) * HASH_SCALE;
  return value - Math.floor(value);
}

export function paintTexture(size: MapSize, painter: Painter): DataTexture {
  const { width, height } = size;
  const pixels = new Uint8Array(width * height * CHANNELS);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const colour = painter((column + 0.5) / width, (row + 0.5) / height);
      const offset = (row * width + column) * CHANNELS;
      colour.forEach((channel, index) => {
        pixels[offset + index] = Math.round(clamp(channel, 0, 1) * BYTE);
      });
    }
  }
  const texture = new DataTexture(pixels, width, height, RGBAFormat);
  const wrap = size.repeat ? RepeatWrapping : ClampToEdgeWrapping;
  texture.wrapS = wrap;
  texture.wrapT = wrap;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
