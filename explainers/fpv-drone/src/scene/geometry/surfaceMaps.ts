import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { clamp, lerp, smoothstep } from '@core/math';
import { fractalNoise, hash2 } from './noise';

export type Rgba = readonly [r: number, g: number, b: number, a: number];
export type Painter = (u: number, v: number) => Rgba;

export interface WeaveLayout {
  size: number;
  tows: number;
  contrast: number;
  grain: number;
  seed: number;
}

export interface SlotLayout {
  size: number;
  count: number;
  width: number;
  from: number;
  to: number;
}

export interface DiscLayout {
  size: number;
  hub: number;
  tipRing: number;
  ringWidth: number;
  ringBoost: number;
  edgeSoftness: number;
}

export interface FieldLayout {
  size: number;
  stripes: number;
  stripeDepth: number;
  mottle: number;
  seed: number;
}

export interface RoadLayout {
  size: number;
  rut: number;
  rutWidth: number;
  depth: number;
  seed: number;
}

const CHANNELS = 4;
const BYTE = 255;
const OPAQUE = 1;
const TWILL_STEP = 2;
const TWILL_PERIOD = 4;
const WEAVE_OCTAVES = 2;
const WEAVE_GRAIN_SCALE = 12;
const SLOT_SHADE = 0.12;
const SLOT_EDGE = 0.06;
const DISC_FADE = 0.35;
const FIELD_OCTAVES = 4;
const FIELD_SCALE = 6;
const FIELD_TINT = [0.98, 1, 0.9] as const;
const ROAD_OCTAVES = 3;
const ROAD_SCALE = 5;
const ROAD_TINT = [1, 0.96, 0.9] as const;

export function paintTexture(
  width: number,
  height: number,
  painter: Painter,
  repeat = false,
): DataTexture {
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
  const texture = new DataTexture(pixels, width, height, RGBAFormat);
  const wrap = repeat ? RepeatWrapping : ClampToEdgeWrapping;
  texture.wrapS = wrap;
  texture.wrapT = wrap;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function weaveShade(layout: WeaveLayout, u: number, v: number): number {
  const column = Math.floor(u * layout.tows);
  const row = Math.floor(v * layout.tows);
  const over = (((column + row) % TWILL_PERIOD) + TWILL_PERIOD) % TWILL_PERIOD < TWILL_STEP;
  const acrossU = (u * layout.tows) % 1;
  const acrossV = (v * layout.tows) % 1;
  const across = over ? acrossV : acrossU;
  const profile = Math.sin(across * Math.PI);
  const tow = lerp(1 - layout.contrast, 1, profile);
  const grain = fractalNoise(
    u * WEAVE_GRAIN_SCALE,
    v * WEAVE_GRAIN_SCALE,
    WEAVE_OCTAVES,
    layout.seed,
    WEAVE_GRAIN_SCALE,
  );
  return tow * (1 - layout.grain * (grain - 0.5));
}

export function weaveTexture(layout: WeaveLayout): DataTexture {
  return paintTexture(
    layout.size,
    layout.size,
    (u, v) => {
      const shade = weaveShade(layout, u, v);
      return [shade, shade, shade, OPAQUE];
    },
    true,
  );
}

export function slotShade(layout: SlotLayout, u: number, v: number): number {
  const across = (u * layout.count) % 1;
  const inSlot =
    smoothstep(across, 0.5 - layout.width / 2 - SLOT_EDGE, 0.5 - layout.width / 2) *
    (1 - smoothstep(across, 0.5 + layout.width / 2, 0.5 + layout.width / 2 + SLOT_EDGE));
  const band =
    smoothstep(v, layout.from - SLOT_EDGE, layout.from) *
    (1 - smoothstep(v, layout.to, layout.to + SLOT_EDGE));
  return lerp(1, SLOT_SHADE, inSlot * band);
}

export function slotTexture(layout: SlotLayout): DataTexture {
  return paintTexture(
    layout.size,
    layout.size,
    (u, v) => {
      const shade = slotShade(layout, u, v);
      return [shade, shade, shade, OPAQUE];
    },
    true,
  );
}

export function discAlpha(layout: DiscLayout, radius: number): number {
  const blade = smoothstep(radius, layout.hub, layout.hub + layout.edgeSoftness);
  const edge = 1 - smoothstep(radius, 1 - layout.edgeSoftness, 1);
  const ring = Math.exp(-(((radius - layout.tipRing) / layout.ringWidth) ** 2));
  return blade * edge * (1 + layout.ringBoost * ring) * (1 - DISC_FADE * radius);
}

export function discTexture(layout: DiscLayout): DataTexture {
  return paintTexture(layout.size, layout.size, (u, v) => {
    const radius = Math.hypot(u - 0.5, v - 0.5) * 2;
    return [1, 1, 1, discAlpha(layout, radius)];
  });
}

export function fieldShade(layout: FieldLayout, u: number, v: number): Rgba {
  const stripe = 0.5 + 0.5 * Math.sin(v * layout.stripes * Math.PI * 2);
  const mottle = fractalNoise(
    u * FIELD_SCALE,
    v * FIELD_SCALE,
    FIELD_OCTAVES,
    layout.seed,
    FIELD_SCALE,
  );
  const speck = hash2(Math.floor(u * layout.size), Math.floor(v * layout.size), layout.seed);
  const level =
    1 -
    layout.stripeDepth * stripe -
    layout.mottle * (mottle - 0.5) -
    0.08 * Math.max(0, speck - 0.8);
  return [level * FIELD_TINT[0], level * FIELD_TINT[1], level * FIELD_TINT[2], OPAQUE];
}

export function fieldTexture(layout: FieldLayout): DataTexture {
  return paintTexture(layout.size, layout.size, (u, v) => fieldShade(layout, u, v), true);
}

export function roadShade(layout: RoadLayout, u: number, v: number): Rgba {
  const ruts = [0.5 - layout.rut, 0.5 + layout.rut];
  const rut = ruts.reduce(
    (most, centre) => Math.max(most, Math.exp(-(((u - centre) / layout.rutWidth) ** 2))),
    0,
  );
  const wear = fractalNoise(u * ROAD_SCALE, v * ROAD_SCALE, ROAD_OCTAVES, layout.seed, ROAD_SCALE);
  const level = 1 + layout.depth * rut - 0.2 * (wear - 0.5);
  return [level * ROAD_TINT[0], level * ROAD_TINT[1], level * ROAD_TINT[2], OPAQUE];
}

export function roadTexture(layout: RoadLayout): DataTexture {
  return paintTexture(layout.size, layout.size, (u, v) => roadShade(layout, u, v), true);
}
