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
import { fractalNoise, hash2 } from './noise';

export type Rgba = readonly [r: number, g: number, b: number, a: number];
export type Painter = (u: number, v: number) => Rgba;
export type Range = readonly [from: number, to: number];

export interface PanelBox {
  u: Range;
  v: Range;
}

export interface PanelLayout {
  size: readonly [width: number, height: number];
  uLines: readonly number[];
  vLines: readonly number[];
  boxes: readonly PanelBox[];
  bands: readonly { v: Range; shade: number }[];
  lineShade: number;
  lineWidth: number;
  grain: number;
  grainScale: number;
  seed: number;
}

export interface SandLayout {
  size: number;
  ripples: number;
  rippleDepth: number;
  rippleWarp: number;
  mottle: number;
  speckle: number;
  seed: number;
}

export interface DiscLayout {
  size: number;
  hub: number;
  tipRing: number;
  ringWidth: number;
  ringBoost: number;
  edgeSoftness: number;
}

export interface CellLayout {
  size: readonly [width: number, height: number];
  cells: readonly [columns: number, rows: number];
  gap: number;
  cell: readonly [r: number, g: number, b: number];
  frame: readonly [r: number, g: number, b: number];
  sheen: number;
}

const CHANNELS = 4;
const BYTE = 255;
const OPAQUE = 1;
const GRAIN_OCTAVES = 3;
const SAND_OCTAVES = 4;
const SPECKLE_CELL = 1;
const WARM_TINT = [1, 0.97, 0.92] as const;
const WARP_SCALE = 4;
const PATCH_SCALE = 8;
const PATCH_SEED = 7;
const DISC_FADE = 0.35;

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

function lineCoverage(distance: number, width: number): number {
  return Math.exp(-((distance / width) ** 2));
}

function inside(value: number, range: Range): boolean {
  return value >= range[0] && value <= range[1];
}

function boxEdgeDistance(u: number, v: number, box: PanelBox, width: number, height: number) {
  const nearU = inside(v, box.v)
    ? Math.min(Math.abs(u - box.u[0]), Math.abs(u - box.u[1])) * width
    : Infinity;
  const nearV = inside(u, box.u)
    ? Math.min(Math.abs(v - box.v[0]), Math.abs(v - box.v[1])) * height
    : Infinity;
  return Math.min(nearU, nearV);
}

export function panelShade(layout: PanelLayout, u: number, v: number): number {
  const [width, height] = layout.size;
  const distances = [
    ...layout.uLines.map((line) => Math.abs(u - line) * width),
    ...layout.vLines.map((line) => Math.abs(v - line) * height),
    ...layout.boxes.map((box) => boxEdgeDistance(u, v, box, width, height)),
  ];
  const nearest = Math.min(Infinity, ...distances);
  const line = lineCoverage(nearest, layout.lineWidth);
  const band = layout.bands.reduce(
    (shade, entry) => (inside(v, entry.v) ? shade * entry.shade : shade),
    1,
  );
  const grain = fractalNoise(
    u * layout.grainScale,
    v * layout.grainScale,
    GRAIN_OCTAVES,
    layout.seed,
  );
  return band * (1 - (1 - layout.lineShade) * line) * (1 - layout.grain * (grain - 0.5));
}

export function panelTexture(layout: PanelLayout): DataTexture {
  const [width, height] = layout.size;
  return paintTexture(width, height, (u, v) => {
    const shade = panelShade(layout, u, v);
    return [shade, shade, shade, OPAQUE];
  });
}

export function sandShade(layout: SandLayout, u: number, v: number): Rgba {
  const { ripples, rippleDepth, rippleWarp, mottle, speckle, seed } = layout;
  const warp =
    fractalNoise(u * WARP_SCALE, v * WARP_SCALE, SAND_OCTAVES, seed, WARP_SCALE) * rippleWarp;
  const ripple = 0.5 + 0.5 * Math.sin((v * ripples + warp) * Math.PI * 2);
  const patches = fractalNoise(
    u * PATCH_SCALE,
    v * PATCH_SCALE,
    SAND_OCTAVES,
    seed + PATCH_SEED,
    PATCH_SCALE,
  );
  const cellU = Math.floor(u * layout.size * SPECKLE_CELL);
  const cellV = Math.floor(v * layout.size * SPECKLE_CELL);
  const grain = hash2(cellU, cellV, seed);
  const level =
    1 - rippleDepth * ripple - mottle * (patches - 0.5) - speckle * Math.max(0, grain - 0.7);
  return [level * WARM_TINT[0], level * WARM_TINT[1], level * WARM_TINT[2], OPAQUE];
}

export function sandTexture(layout: SandLayout): DataTexture {
  return paintTexture(layout.size, layout.size, (u, v) => sandShade(layout, u, v), true);
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

export function cellTexture(layout: CellLayout): DataTexture {
  const [columns, rows] = layout.cells;
  return paintTexture(layout.size[0], layout.size[1], (u, v) => {
    const cu = (u * columns) % 1;
    const cv = (v * rows) % 1;
    const gap = layout.gap;
    const isFrame = cu < gap || cu > 1 - gap || cv < gap || cv > 1 - gap;
    const base = isFrame ? layout.frame : layout.cell;
    const sheen = 1 + layout.sheen * (v - 0.5);
    return [base[0] * sheen, base[1] * sheen, base[2] * sheen, OPAQUE];
  });
}
