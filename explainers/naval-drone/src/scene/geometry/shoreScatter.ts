import { FULL_TURN, lerp } from '@core/math';
import type { Range } from './shoreTerrain';
import {
  SCRUB_PATCH,
  band,
  hash,
  patchShare,
  shoreHeight,
  shorelineX,
  slipwayGap,
  stationGap,
} from './shoreTerrain';

export interface Placement {
  x: number;
  y: number;
  z: number;
  scale: number;
  turn: number;
  tone: number;
}

interface Growth {
  seed: number;
  size: Range;
  sink: number;
}

type Cluster = readonly [x: number, z: number, count: number, spreadX: number, spreadZ: number];

export const SCRUB_COUNT = 240;

const SCRUB: Growth = { seed: 101, size: [0.6, 1.5], sink: 0.3 };
const SCRUB_X: Range = [-128, -26];
const SCRUB_Z: Range = [-118, 48];
const SCRUB_BIAS = 1.4;
const SCRUB_BAND = [32, 48, 140, 180] as const;
const SCRUB_FLOOR = 0.08;
const KEEP_OFF_SLIPWAY = 7;
const KEEP_OFF_STATION = 1;
const ROCK: Growth = { seed: 151, size: [0.45, 0.95], sink: 0.22 };
const ROCK_CLEARANCE = 0.6;
const ROCK_CLUSTERS: readonly Cluster[] = [
  [-3, 3.9, 6, 3.5, 1],
  [-2.5, -3.9, 5, 3.5, 1],
  [-25, 5.4, 4, 2, 0.8],
];
const TRIES = 12;
const STEP = 0.5;
const HALF = 0.5;
const X_KEY = 0;
const Z_KEY = 1;
const SIDE_KEY = 2;
const KEEP_KEY = 3;
const SIZE_KEY = 4;
const TURN_KEY = 5;
const TONE_KEY = 6;

function slopeAt(x: number, z: number): number {
  const dx = shoreHeight(x + STEP, z) - shoreHeight(x - STEP, z);
  const dz = shoreHeight(x, z + STEP) - shoreHeight(x, z - STEP);
  return Math.hypot(dx, dz) / (STEP + STEP);
}

function place({ seed, size, sink }: Growth, index: number, x: number, z: number) {
  const pick = (key: number) => hash(index, seed + key);
  const scale = lerp(size[0], size[1], pick(SIZE_KEY));
  return {
    x,
    y: shoreHeight(x, z) - scale * (sink + slopeAt(x, z)),
    z,
    scale,
    turn: pick(TURN_KEY) * FULL_TURN,
    tone: pick(TONE_KEY),
  };
}

function scrubChance(x: number, z: number): number {
  if (slipwayGap(x, z) < KEEP_OFF_SLIPWAY || stationGap(x, z) < KEEP_OFF_STATION) return 0;
  const share = band(shorelineX(z) - x, SCRUB_BAND);
  return share * Math.max(SCRUB_FLOOR, patchShare(x, z, SCRUB_PATCH));
}

export function scatterScrub(): Placement[] {
  const placed: Placement[] = [];
  for (let index = 0; index < SCRUB_COUNT * TRIES && placed.length < SCRUB_COUNT; index += 1) {
    const pick = (key: number) => hash(index, SCRUB.seed + key);
    const x = lerp(SCRUB_X[0], SCRUB_X[1], pick(X_KEY));
    const z = lerp(0, pick(SIDE_KEY) < HALF ? SCRUB_Z[0] : SCRUB_Z[1], pick(Z_KEY) ** SCRUB_BIAS);
    if (pick(KEEP_KEY) < scrubChance(x, z)) {
      placed.push(place(SCRUB, index, x, z));
    }
  }
  return placed;
}

export function scatterRocks(): Placement[] {
  return ROCK_CLUSTERS.flatMap(([cx, cz, count, spreadX, spreadZ], group) =>
    Array.from({ length: count }, (_, item) => {
      const index = group * TRIES + item;
      const offset = (key: number) => (hash(index, ROCK.seed + key) - HALF) / HALF;
      const x = cx + offset(X_KEY) * spreadX;
      const z = cz + offset(Z_KEY) * spreadZ;
      return slipwayGap(x, z) > ROCK_CLEARANCE ? [place(ROCK, index, x, z)] : [];
    }).flat(),
  );
}
