import { hash2 } from './random';

function fade(share: number): number {
  return share * share * (3 - 2 * share);
}

export function valueNoise(x: number, z: number, seed: number): number {
  const cellX = Math.floor(x);
  const cellZ = Math.floor(z);
  const shareX = fade(x - cellX);
  const shareZ = fade(z - cellZ);
  const a = hash2(cellX, cellZ, seed);
  const b = hash2(cellX + 1, cellZ, seed);
  const c = hash2(cellX, cellZ + 1, seed);
  const d = hash2(cellX + 1, cellZ + 1, seed);
  const near = a + (b - a) * shareX;
  const far = c + (d - c) * shareX;
  return near + (far - near) * shareZ;
}

export function wavelengthNoise(x: number, z: number, wavelength: number, seed: number): number {
  return valueNoise(x / wavelength, z / wavelength, seed);
}
