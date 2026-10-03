import type { DataTexture } from 'three';
import { SEA } from '../../constants';
import { repeating, seededRandom } from '../surfaces';

const CHANNELS = 4;
const BYTE = 255;
const HALF = 0.5;
const SLOPE_GAIN = 0.5;
const MIN_FREQUENCY = 3;
const FREQUENCY_SPAN = 26;
const FOAM_OCTAVES = 4;
const FOAM_BASE = 8;

interface RippleWave {
  kx: number;
  ky: number;
  amplitude: number;
  phase: number;
}

export function rippleWaves(count: number, seed: number): RippleWave[] {
  const random = seededRandom(seed);
  return Array.from({ length: count }, () => {
    const frequency = MIN_FREQUENCY + Math.floor(random() * FREQUENCY_SPAN);
    const angle = random() * Math.PI * 2;
    const kx = Math.round(Math.cos(angle) * frequency);
    const ky = Math.round(Math.sin(angle) * frequency);
    const length = Math.max(Math.hypot(kx, ky), 1);
    return { kx, ky, amplitude: 1 / length, phase: random() * Math.PI * 2 };
  });
}

export function rippleTexture(): DataTexture {
  const { size, waves, seed } = SEA.ripples;
  const set = rippleWaves(waves, seed);
  const pixels = new Uint8Array(size * size * CHANNELS);
  const total = set.reduce((sum, wave) => sum + wave.amplitude * Math.hypot(wave.kx, wave.ky), 0);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let dx = 0;
      let dy = 0;
      set.forEach(({ kx, ky, amplitude, phase }) => {
        const angle = ((kx * x + ky * y) / size) * Math.PI * 2 + phase;
        const slope = amplitude * Math.cos(angle);
        dx += slope * kx;
        dy += slope * ky;
      });
      const offset = (y * size + x) * CHANNELS;
      pixels[offset] = Math.round((HALF + (SLOPE_GAIN * dx) / total) * BYTE);
      pixels[offset + 1] = Math.round((HALF + (SLOPE_GAIN * dy) / total) * BYTE);
      pixels[offset + 2] = BYTE;
      pixels[offset + 3] = BYTE;
    }
  }
  return repeating(pixels, size);
}

function periodicNoise(
  size: number,
  cells: number,
  random: () => number,
): (x: number, y: number) => number {
  const grid = Array.from({ length: cells * cells }, () => random());
  const at = (i: number, j: number) =>
    grid[(((j % cells) + cells) % cells) * cells + (((i % cells) + cells) % cells)];
  return (x, y) => {
    const fx = (x / size) * cells;
    const fy = (y / size) * cells;
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const tx = fx - i;
    const ty = fy - j;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const bottom = at(i, j) + (at(i + 1, j) - at(i, j)) * sx;
    const top = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * sx;
    return bottom + (top - bottom) * sy;
  };
}

export function foamTexture(): DataTexture {
  const { size, seed } = SEA.foam;
  const random = seededRandom(seed);
  const octaves = Array.from({ length: FOAM_OCTAVES }, (_, index) =>
    periodicNoise(size, FOAM_BASE * 2 ** index, random),
  );
  const pixels = new Uint8Array(size * size * CHANNELS);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let value = 0;
      let weight = HALF;
      octaves.forEach((noise) => {
        value += weight * noise(x, y);
        weight *= HALF;
      });
      const cells = 1 - Math.abs(2 * octaves[1](x, y) - 1);
      const byte = Math.round(Math.min(1, value * 0.9 + cells * 0.35) * BYTE);
      pixels.set([byte, byte, byte, BYTE], (y * size + x) * CHANNELS);
    }
  }
  return repeating(pixels, size);
}
