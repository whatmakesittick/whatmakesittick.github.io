import { FULL_TURN, lerp, smoothstep } from '@core/math';
import { SLIPWAY } from '../../model/layout';
import type { TerrainGrid } from './shoreGrid';
import { gridHeight } from './shoreGrid';
import { hash2, signedHash } from './shoreNoise';
import type { Range, Spot } from './shoreTerrain';
import {
  TRACK,
  grassPatch,
  inlandDistance,
  scrubPatch,
  slipwayGap,
  stationGap,
  trackHit,
} from './shoreTerrain';

export interface Placement {
  x: number;
  y: number;
  z: number;
  scale: number;
  stretch: number;
  turn: number;
  tone: number;
}

interface Growth {
  seed: number;
  size: Range;
  sink: number;
}

interface ScatterRule extends Growth {
  count: number;
  x: Range;
  z: Range;
  zPower: number;
  keepOut: { slipway: number; track: number; station: number };
  chance: (x: number, z: number) => number;
}

type Band = readonly [number, number, number, number];

const SEEDS = { x: 0, z: 1, side: 2, keep: 3, size: 4, turn: 5, tone: 6, stretch: 7 } as const;
const CANDIDATES_PER_ITEM = 12;
const SLOPE_STEP = 0.5;
const SIDE_SPLIT = 0.5;
const STRETCH = [0.75, 1.3] as const;

export const SCRUB = {
  count: 210,
  seed: 101,
  x: [-140, -26] as Range,
  z: [-300, 220] as Range,
  zPower: 1.8,
  size: [0.6, 1.5] as Range,
  sink: 0.3,
  keepOut: { slipway: 7, track: TRACK.halfWidth + 1.5, station: 1 },
  band: [32, 48, 140, 180] as Band,
  patchFloor: 0.08,
} as const;

export const TUFTS = {
  count: 900,
  seed: 131,
  x: [-80, -10] as Range,
  z: [-130, 90] as Range,
  zPower: 1.7,
  size: [0.6, 1.3] as Range,
  sink: 0.04,
  keepOut: { slipway: 3, track: TRACK.halfWidth + 0.4, station: 0.5 },
  band: [13, 24, 90, 130] as Band,
  floor: 0.12,
} as const;

export const ROCKS = {
  seed: 151,
  clusters: [
    { centre: [-3, 3.9] as Spot, spread: [3.5, 1] as Range, count: 6 },
    { centre: [-2.5, -3.9] as Spot, spread: [3.5, 1] as Range, count: 5 },
    { centre: [-24, 5.4] as Spot, spread: [1.5, 0.8] as Range, count: 3 },
    { centre: [-26.5, -5.4] as Spot, spread: [1.5, 0.8] as Range, count: 2 },
  ],
  size: [0.45, 0.95] as Range,
  sink: 0.22,
  clearance: 0.6,
} as const;

function band(inland: number, edges: Band): number {
  return smoothstep(inland, edges[0], edges[1]) * (1 - smoothstep(inland, edges[2], edges[3]));
}

function blocked(x: number, z: number, keepOut: ScatterRule['keepOut']): boolean {
  if (slipwayGap(x, z) < keepOut.slipway) return true;
  if (stationGap(x, z) < keepOut.station) return true;
  const hit = trackHit(x, z);
  return hit !== null && hit.distance < keepOut.track;
}

export function slopeAt(grid: TerrainGrid, x: number, z: number): number {
  const dx = gridHeight(grid, x + SLOPE_STEP, z) - gridHeight(grid, x - SLOPE_STEP, z);
  const dz = gridHeight(grid, x, z + SLOPE_STEP) - gridHeight(grid, x, z - SLOPE_STEP);
  return Math.hypot(dx, dz) / (SLOPE_STEP + SLOPE_STEP);
}

function biased(range: Range, power: number, share: number, side: number): number {
  const reach = Math.pow(share, power);
  return lerp(0, side < SIDE_SPLIT ? range[0] : range[1], reach);
}

function place(grid: TerrainGrid, growth: Growth, index: number, x: number, z: number) {
  const { seed, size } = growth;
  const scale = lerp(size[0], size[1], hash2(index, seed + SEEDS.size));
  const sink = scale * (growth.sink + slopeAt(grid, x, z));
  return {
    x,
    y: gridHeight(grid, x, z) - sink,
    z,
    scale,
    stretch: lerp(STRETCH[0], STRETCH[1], hash2(index, seed + SEEDS.stretch)),
    turn: hash2(index, seed + SEEDS.turn) * FULL_TURN,
    tone: hash2(index, seed + SEEDS.tone),
  };
}

function scatter(grid: TerrainGrid, rule: ScatterRule): Placement[] {
  const placed: Placement[] = [];
  const tries = rule.count * CANDIDATES_PER_ITEM;
  for (let index = 0; index < tries && placed.length < rule.count; index += 1) {
    const x = lerp(rule.x[0], rule.x[1], hash2(index, rule.seed + SEEDS.x));
    const side = hash2(index, rule.seed + SEEDS.side);
    const z = biased(rule.z, rule.zPower, hash2(index, rule.seed + SEEDS.z), side);
    if (blocked(x, z, rule.keepOut)) continue;
    if (hash2(index, rule.seed + SEEDS.keep) > rule.chance(x, z)) continue;
    placed.push(place(grid, rule, index, x, z));
  }
  return placed;
}

export function scatterScrub(grid: TerrainGrid): Placement[] {
  return scatter(grid, {
    ...SCRUB,
    chance: (x, z) =>
      band(inlandDistance(x, z), SCRUB.band) * Math.max(SCRUB.patchFloor, scrubPatch(x, z)),
  });
}

export function scatterTufts(grid: TerrainGrid): Placement[] {
  return scatter(grid, {
    ...TUFTS,
    chance: (x, z) =>
      band(inlandDistance(x, z), TUFTS.band) * Math.max(TUFTS.floor, grassPatch(x, z)),
  });
}

function clearOfSlipway(x: number, z: number): boolean {
  return slipwayGap(x, z) > ROCKS.clearance && Math.abs(z) > SLIPWAY.z[1];
}

export function scatterRocks(grid: TerrainGrid): Placement[] {
  return ROCKS.clusters.flatMap((cluster, group) =>
    Array.from({ length: cluster.count }, (_, item) => {
      const index = group * CANDIDATES_PER_ITEM + item;
      const x = cluster.centre[0] + signedHash(index, ROCKS.seed + SEEDS.x) * cluster.spread[0];
      const z = cluster.centre[1] + signedHash(index, ROCKS.seed + SEEDS.z) * cluster.spread[1];
      return clearOfSlipway(x, z) ? place(grid, ROCKS, index, x, z) : null;
    }).filter((rock): rock is Placement => rock !== null),
  );
}
