import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { seededRandom } from './random';
import type { Random } from './random';

export type GrainDirection = 'u' | 'v';

export interface GrainSpec {
  direction: GrainDirection;
  along: number;
  across: number;
  period: readonly [along: number, across: number];
  bands: number;
  waviness: number;
  floor: number;
  seed: number;
}

const CHANNELS = 4;
const BYTE = 255;
const GREEN_DEPTH = 1.15;
const BLUE_DEPTH = 1.35;
const NOISE_SHARE = 0.25;

function bandProfile(size: number, bands: number, random: Random): Float32Array {
  const waves = Array.from({ length: bands }, () => ({
    frequency: 1 + Math.floor(random() * size * 0.25),
    phase: random() * Math.PI * 2,
    weight: 0.3 + random() * 0.7,
  }));
  const total = waves.reduce((sum, wave) => sum + wave.weight, 0);
  const profile = new Float32Array(size);
  for (let index = 0; index < size; index += 1) {
    const turn = (index / size) * Math.PI * 2;
    const smooth = waves.reduce(
      (sum, wave) => sum + wave.weight * Math.sin(wave.frequency * turn + wave.phase),
      0,
    );
    const value = 0.5 + (0.5 * smooth) / total;
    profile[index] = (1 - NOISE_SHARE) * value + NOISE_SHARE * random();
  }
  return profile;
}

function sway(position: number, size: number, waviness: number, phase: number): number {
  return waviness * Math.sin((position / size) * Math.PI * 2 * 2 + phase);
}

export function woodGrain(spec: GrainSpec): DataTexture {
  const random = seededRandom(spec.seed);
  const profile = bandProfile(spec.across, spec.bands, random);
  const phase = random() * Math.PI * 2;
  const width = spec.direction === 'u' ? spec.along : spec.across;
  const height = spec.direction === 'u' ? spec.across : spec.along;
  const pixels = new Uint8Array(width * height * CHANNELS);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const [along, across] = spec.direction === 'u' ? [column, row] : [row, column];
      const shifted = across + sway(along, spec.along, spec.waviness, phase);
      const index = ((Math.round(shifted) % spec.across) + spec.across) % spec.across;
      const level = spec.floor + (1 - spec.floor) * profile[index];
      const offset = (row * width + column) * CHANNELS;
      pixels[offset] = BYTE * level;
      pixels[offset + 1] = BYTE * level ** GREEN_DEPTH;
      pixels[offset + 2] = BYTE * level ** BLUE_DEPTH;
      pixels[offset + 3] = BYTE;
    }
  }
  const texture = new DataTexture(pixels, width, height, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = SRGBColorSpace;
  const [alongPeriod, acrossPeriod] = spec.period;
  if (spec.direction === 'u') texture.repeat.set(1 / alongPeriod, 1 / acrossPeriod);
  else texture.repeat.set(1 / acrossPeriod, 1 / alongPeriod);
  texture.needsUpdate = true;
  return texture;
}
