import { Color } from 'three';
import { FULL_TURN, clamp, lerp, smoothstep } from '@core/math';
import { GROUND_STATION, SHORELINE_X, SLIPWAY } from '../../model/layout';
import { THEME } from '../../theme';

export type Range = readonly [number, number];

export interface TerrainGrid {
  xs: readonly number[];
  zs: readonly number[];
  heights: Float32Array;
}

type Tint = readonly [colour: string, from: number, to: number, share: number, patch?: number];

export const SLAB_THICKNESS = 0.35;
export const APRON = { x: [-28, SLIPWAY.x[0]] as Range, z: [-4, 4] as Range } as const;
export const SCRUB_PATCH = 19;

const CALM_REACH = 60;
const CALM_BLEND = 240;
const COAST_SWING = 200;
const COAST_SCALE = 900;
const SHELF_SLOPE = 0.075;
const SHELF_REACH = 80;
const BEACH_SLOPE = 1 / 15;
const BEACH_WIDTH = 30;
const LAND_RISE = 0.012;
const HILLS = [140, 900, 38, 520, 0.28, 0.78] as const;
const DUNE_BAND = [22, 36, 110, 165] as const;
const DUNE_CREST = 42;
const DUNE_SPACING = 34;
const DUNE_LUMPS = [28, 70] as const;
const DUNE_HEIGHT = [2, 4, 260] as const;
const DUNE_RIDGE = 0.42;
const DUNE_EDGES = [0.22, 0.8] as const;
const CUT_REVEAL = 0.16;
const CUT_SINK = 0.12;
const CUT_SHOULDER = 3;
const STATION_FLAT = [17, 13] as const;
const STATION_CORNER = 5;
const STATION_BLEND = 16;
const GRID_X: Range = [-1200, 160];
const GRID_Z: Range = [-2500, 2500];
const FINE_X: Range = [-130, 8];
const FINE_Z: Range = [-120, 50];
const CELL = 2.4;
const GROWTH = 1.27;
const SEA_GROWTH = 1.45;
const CLEARANCE = 0.3;
const EDGE_GAP = 0.02;
const EDGE_INSET = 0.4;
const PATCH = [24, 0.4, 0.62] as const;

const TINTS: readonly Tint[] = [
  ['#6c6151', -4, 1, 1],
  [THEME.beach, 2, 6.5, 1],
  ['#8a8858', 16, 34, 0.8, 31],
  ['#6f6e50', 44, 85, 0.75],
  ['#53573b', 30, 60, 0.85, SCRUB_PATCH],
  [THEME.shore, 80, 150, 1],
];

const HASH = [127.1, 311.7, 74.7, 43758.5453] as const;
const OCTAVES = 4;
const MIDDLE = 0.5;
const SWING_SEED = 3;
const LUMPS_SEED = 11;
const SIZE_SEED = 13;
const HILLS_SEED = 17;
const EPSILON = 1e-6;

export function hash(x: number, y: number, seed = 0): number {
  const value = Math.sin(x * HASH[0] + y * HASH[1] + seed * HASH[2]) * HASH[3];
  return value - Math.floor(value);
}

function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothstep(x - x0);
  const corner = (dx: number, dy: number) => hash(x0 + dx, y0 + dy, seed);
  const bottom = lerp(corner(0, 0), corner(1, 0), tx);
  return lerp(bottom, lerp(corner(0, 1), corner(1, 1), tx), smoothstep(y - y0));
}

export function noise(x: number, y: number, seed: number): number {
  let total = 0;
  let norm = 0;
  for (let octave = 0, weight = 1; octave < OCTAVES; octave += 1, weight *= MIDDLE) {
    total += weight * valueNoise(x / weight, y / weight, seed + octave);
    norm += weight;
  }
  return total / norm;
}

export function shorelineX(z: number): number {
  const reach = smoothstep(Math.abs(z), CALM_REACH, CALM_REACH + CALM_BLEND);
  return SHORELINE_X + reach * COAST_SWING * (noise(z / COAST_SCALE, MIDDLE, SWING_SEED) - MIDDLE);
}

export function profileHeight(inland: number): number {
  if (inland > 0) {
    return (
      Math.min(inland, BEACH_WIDTH) * BEACH_SLOPE + Math.max(0, inland - BEACH_WIDTH) * LAND_RISE
    );
  }
  return Math.max(inland, -SHELF_REACH) * SHELF_SLOPE;
}

export function band(value: number, edges: readonly number[]): number {
  return smoothstep(value, edges[0], edges[1]) * (1 - smoothstep(value, edges[2], edges[3]));
}

function duneHeight(x: number, z: number, inland: number): number {
  const share = band(inland, DUNE_BAND);
  if (share <= 0) return 0;
  const wave = MIDDLE + MIDDLE * Math.cos((FULL_TURN * (inland - DUNE_CREST)) / DUNE_SPACING);
  const lumps = noise(x / DUNE_LUMPS[0], z / DUNE_LUMPS[1], LUMPS_SEED);
  const [low, high, scale] = DUNE_HEIGHT;
  const tall = lerp(low, high, noise(x / scale, z / scale, SIZE_SEED));
  return share * tall * smoothstep(lerp(lumps, wave, DUNE_RIDGE), ...DUNE_EDGES);
}

export function naturalHeight(x: number, z: number): number {
  const inland = shorelineX(z) - x;
  const [from, to, height, scale, low, high] = HILLS;
  const level = smoothstep(noise(x / scale, z / scale, HILLS_SEED), low, high);
  const hills = smoothstep(inland, from, to) * height * level;
  return profileHeight(inland) + duneHeight(x, z, inland) + hills;
}

export function slabTop(x: number): number {
  const share = clamp((x - SLIPWAY.x[0]) / (SLIPWAY.x[1] - SLIPWAY.x[0]), 0, 1);
  return lerp(SLIPWAY.top, SLIPWAY.foot, share);
}

function rectGap(x: number, z: number, xs: Range, zs: Range): number {
  return Math.hypot(Math.max(xs[0] - x, 0, x - xs[1]), Math.max(zs[0] - z, 0, z - zs[1]));
}

export function slipwayGap(x: number, z: number): number {
  return Math.min(rectGap(x, z, SLIPWAY.x, SLIPWAY.z), rectGap(x, z, APRON.x, APRON.z));
}

export function stationGap(x: number, z: number): number {
  const qx = Math.max(Math.abs(x - GROUND_STATION[0]) - STATION_FLAT[0] + STATION_CORNER, 0);
  const qz = Math.max(Math.abs(z - GROUND_STATION[2]) - STATION_FLAT[1] + STATION_CORNER, 0);
  return Math.max(0, Math.hypot(qx, qz) - STATION_CORNER);
}

export function shoreHeight(x: number, z: number): number {
  const level = smoothstep(stationGap(x, z), 0, STATION_BLEND);
  const ground = lerp(GROUND_STATION[1], naturalHeight(x, z), level);
  const gap = slipwayGap(x, z);
  if (gap > CUT_SHOULDER) return ground;
  const top = slabTop(clamp(x, APRON.x[0], SLIPWAY.x[1]));
  if (gap <= 0) return top - SLAB_THICKNESS - CUT_SINK;
  return lerp(top - CUT_REVEAL, ground, smoothstep(gap, 0, CUT_SHOULDER));
}

export function patchShare(x: number, z: number, seed: number): number {
  const [scale, low, high] = PATCH;
  return smoothstep(noise(x / scale, z / scale, seed), low, high);
}

const PALETTE = TINTS.map(([colour, ...rest]) => [new Color(colour), ...rest] as const);
const SEABED = new Color('#4f493d');
const GRAVEL = new Color('#8e897e');

export function shoreColour(x: number, z: number, target: Color): Color {
  const inland = shorelineX(z) - x;
  target.copy(SEABED);
  PALETTE.forEach(([tone, from, to, share, patch]) => {
    const spread = patch ? patchShare(x, z, patch) : 1;
    target.lerp(tone, smoothstep(inland, from, to) * share * spread);
  });
  return target.lerp(GRAVEL, 1 - smoothstep(stationGap(x, z), 0, STATION_CORNER));
}

function outward(start: number, limit: number, growth: number): number[] {
  const lines: number[] = [];
  const direction = Math.sign(limit - start);
  for (
    let size = CELL * growth, at = start + direction * size;
    direction * (limit - at) > EPSILON;
  ) {
    lines.push(at);
    size *= growth;
    at += direction * size;
  }
  return lines;
}

export function gridLines(
  extent: Range,
  fine: Range,
  growth: Range,
  keep: readonly number[],
): number[] {
  const inner: number[] = [];
  for (let at = fine[0]; at <= fine[1] + EPSILON; at += CELL) inner.push(at);
  const base = [
    ...outward(fine[0], extent[0], growth[0]),
    ...inner,
    ...outward(inner[inner.length - 1], extent[1], growth[1]),
  ];
  const spaced = base.filter((line) =>
    keep.every((kept) => Math.abs(kept - line) > CELL * CLEARANCE),
  );
  return [extent[0], ...spaced, ...keep, extent[1]].sort((a, b) => a - b);
}

function breaks(edges: readonly number[]): number[] {
  return edges.flatMap((edge, index) => {
    const inward = index % 2 === 0 ? 1 : -1;
    return [edge - inward * EDGE_GAP, edge + inward * EDGE_INSET];
  });
}

export function terrainGrid(): TerrainGrid {
  const xs = gridLines(GRID_X, FINE_X, [GROWTH, SEA_GROWTH], breaks([APRON.x[0], SLIPWAY.x[1]]));
  const zEdges = [SLIPWAY.z[0], SLIPWAY.z[1], APRON.z[0], APRON.z[1]];
  const zs = gridLines(GRID_Z, FINE_Z, [GROWTH, GROWTH], breaks(zEdges));
  const heights = new Float32Array(xs.length * zs.length);
  zs.forEach((z, row) =>
    xs.forEach((x, column) => (heights[row * xs.length + column] = shoreHeight(x, z))),
  );
  return { xs, zs, heights };
}
