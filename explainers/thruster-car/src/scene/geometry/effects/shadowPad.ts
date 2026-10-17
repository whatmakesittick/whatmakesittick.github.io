import { DataTexture, LinearFilter, RGBAFormat } from 'three';
import { smoothstep } from '@core/math';

type Pair = readonly [number, number];

export interface ShadowPadLayout {
  size: Pair;
  pad: Pair;
  padCorner: number;
  padBlur: number;
  padAlpha: number;
  spots: readonly Pair[];
  spot: Pair;
  spotAlpha: number;
}

const PIXELS_PER_METRE = 48;
const RGBA = 4;
const ALPHA = 3;
const BYTE = 255;
const SPOT_CORE = 0.25;

function roundedBoxDistance(x: number, z: number, layout: ShadowPadLayout): number {
  const corner = layout.padCorner;
  const qx = Math.abs(x) - (layout.pad[0] / 2 - corner);
  const qz = Math.abs(z) - (layout.pad[1] / 2 - corner);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qz, 0));
  return outside + Math.min(Math.max(qx, qz), 0) - corner;
}

function spotAlpha(x: number, z: number, layout: ShadowPadLayout): number {
  let clear = 1;
  for (const [sx, sz] of layout.spots) {
    const reach = Math.hypot((x - sx) / layout.spot[0], (z - sz) / layout.spot[1]);
    clear *= 1 - layout.spotAlpha * (1 - smoothstep(reach, SPOT_CORE, 1));
  }
  return 1 - clear;
}

export function shadowPadAlpha(x: number, z: number, layout: ShadowPadLayout): number {
  const edge = roundedBoxDistance(x, z, layout);
  const pad = layout.padAlpha * (1 - smoothstep(edge, -layout.padBlur / 2, layout.padBlur));
  return 1 - (1 - pad) * (1 - spotAlpha(x, z, layout));
}

export function shadowPadTexture(layout: ShadowPadLayout): DataTexture {
  const width = Math.round(layout.size[0] * PIXELS_PER_METRE);
  const height = Math.round(layout.size[1] * PIXELS_PER_METRE);
  const data = new Uint8Array(width * height * RGBA);
  for (let row = 0; row < height; row++) {
    const z = ((row + 0.5) / height - 0.5) * layout.size[1];
    for (let column = 0; column < width; column++) {
      const x = ((column + 0.5) / width - 0.5) * layout.size[0];
      data[(row * width + column) * RGBA + ALPHA] = Math.round(shadowPadAlpha(x, z, layout) * BYTE);
    }
  }
  const texture = new DataTexture(data, width, height, RGBAFormat);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}
