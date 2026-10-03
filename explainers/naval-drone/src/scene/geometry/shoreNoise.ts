import { lerp } from '@core/math';

const HASH = { x: 127.1, y: 311.7, seed: 74.7, scale: 43758.5453 } as const;
const OCTAVE_GAIN = 0.5;
const OCTAVE_LACUNARITY = 2;
const OCTAVES = 4;
const MIDDLE = 0.5;

export function hash2(x: number, y: number, seed = 0): number {
  const value = Math.sin(x * HASH.x + y * HASH.y + seed * HASH.seed) * HASH.scale;
  return value - Math.floor(value);
}

function fade(t: number): number {
  return t * t * (3 - 2 * t);
}

function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = fade(x - x0);
  const ty = fade(y - y0);
  const corner = (dx: number, dy: number) => hash2(x0 + dx, y0 + dy, seed);
  const bottom = lerp(corner(0, 0), corner(1, 0), tx);
  const top = lerp(corner(0, 1), corner(1, 1), tx);
  return lerp(bottom, top, ty);
}

export function fractalNoise(x: number, y: number, seed = 0, octaves = OCTAVES): number {
  let total = 0;
  let weight = 1;
  let frequency = 1;
  let norm = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    total += weight * valueNoise(x * frequency, y * frequency, seed + octave);
    norm += weight;
    weight *= OCTAVE_GAIN;
    frequency *= OCTAVE_LACUNARITY;
  }
  return total / norm;
}

export function centredNoise(x: number, y: number, seed = 0): number {
  return fractalNoise(x, y, seed) - MIDDLE;
}

export function signedNoise(x: number, y: number, seed = 0): number {
  return centredNoise(x, y, seed) / MIDDLE;
}

export function signedHash(x: number, y: number, seed = 0): number {
  return (hash2(x, y, seed) - MIDDLE) / MIDDLE;
}
