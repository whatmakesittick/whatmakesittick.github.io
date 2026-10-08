import { DataTexture, LinearMipmapLinearFilter, LinearFilter, RepeatWrapping } from 'three';
import { FULL_TURN, smoothstep } from '@core/math';

const RGBA = 4;
const FULL_BYTE = 255;
const DASH_TEXELS = 64;
const DASH_SHARE = 0.45;
const DASH_EDGE = 0.08;
const DASH_GAP_LEVEL = 0.28;
const STREAK_TEXELS = 64;
const STREAK_FLOOR = 0.3;
const STREAK_WAVES = [
  { along: 1, around: 3, weight: 0.45 },
  { along: 2, around: 5, weight: 0.3 },
  { along: 3, around: 2, weight: 0.25 },
] as const;
const HASH_SCALE = 12.9898;
const HASH_LIFT = 43758.5453;

function hash(seed: number): number {
  const value = Math.sin(seed * HASH_SCALE) * HASH_LIFT;
  return value - Math.floor(value);
}

function greyTexture(width: number, height: number, level: (u: number, v: number) => number) {
  const data = new Uint8Array(width * height * RGBA);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const byte = Math.round(FULL_BYTE * level(column / width, row / height));
      data.set([byte, byte, byte, FULL_BYTE], (row * width + column) * RGBA);
    }
  }
  const texture = new DataTexture(data, width, height);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function dashLevel(u: number): number {
  const rise = smoothstep(u, 0, DASH_EDGE);
  const fall = 1 - smoothstep(u, DASH_SHARE - DASH_EDGE, DASH_SHARE);
  return DASH_GAP_LEVEL + (1 - DASH_GAP_LEVEL) * Math.min(rise, fall);
}

function streakLevel(u: number, v: number): number {
  const ripple = STREAK_WAVES.reduce((sum, wave, index) => {
    const phase = hash(index + 1) * FULL_TURN;
    return sum + wave.weight * Math.sin(FULL_TURN * (wave.along * u + wave.around * v) + phase);
  }, 0);
  return STREAK_FLOOR + (1 - STREAK_FLOOR) * (0.5 + ripple / 2);
}

export function dashTexture(): DataTexture {
  return greyTexture(DASH_TEXELS, 1, dashLevel);
}

export function streakTexture(): DataTexture {
  return greyTexture(STREAK_TEXELS, STREAK_TEXELS, streakLevel);
}
