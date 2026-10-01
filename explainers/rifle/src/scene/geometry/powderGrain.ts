import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { seededRandom } from './random';

export interface PowderSpec {
  size: number;
  grains: number;
  radius: readonly [min: number, max: number];
  period: number;
  base: readonly [number, number, number];
  grain: readonly [number, number, number];
  seed: number;
}

const CHANNELS = 4;
const BYTE = 255;

export function powderGrain(spec: PowderSpec): DataTexture {
  const random = seededRandom(spec.seed);
  const { size } = spec;
  const pixels = new Uint8Array(size * size * CHANNELS);
  for (let index = 0; index < size * size; index += 1) {
    pixels.set([...spec.base, BYTE], index * CHANNELS);
  }
  for (let grain = 0; grain < spec.grains; grain += 1) {
    const centreX = random() * size;
    const centreY = random() * size;
    const radius = spec.radius[0] + random() * (spec.radius[1] - spec.radius[0]);
    const shade = 0.6 + 0.4 * random();
    const reach = Math.ceil(radius);
    for (let dy = -reach; dy <= reach; dy += 1) {
      for (let dx = -reach; dx <= reach; dx += 1) {
        const distance = Math.hypot(dx, dy) / radius;
        if (distance > 1) continue;
        const x = (Math.floor(centreX + dx) + size) % size;
        const y = (Math.floor(centreY + dy) + size) % size;
        const light = shade * (1 - 0.45 * distance * distance);
        pixels.set(
          spec.grain.map((channel) => Math.round(channel * light)),
          (y * size + x) * CHANNELS,
        );
      }
    }
  }
  const texture = new DataTexture(pixels, size, size, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = SRGBColorSpace;
  texture.repeat.set(1 / spec.period, 1 / spec.period);
  texture.needsUpdate = true;
  return texture;
}
