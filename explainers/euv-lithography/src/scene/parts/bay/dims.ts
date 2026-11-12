import { FLOOR } from '../fab/dims';

export interface Footprint {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export const HALL: Footprint = { minX: -120, maxX: 120, minZ: -18, maxZ: FLOOR.maxZ };
export const HERO: Footprint = FLOOR;
export const HERO_SIGHTS: readonly (readonly [number, number])[] = [
  [-7, 0],
  [0, 0],
  [6.5, 0],
];

export const CEILING_Y = 8.6;
export const TILE_BLOCK_M = 1.2;
export const CELL_M = 1.2;
export const CELL_OFFSET_Z = 0.6;
export const WALL_REPEAT_M = 2.4;

export const STRIP = {
  rowsZ: [1.8, -1.8, -5.4, -9, -12.6, -16.2],
  length: 3.6,
  pitch: 4.8,
  width: 0.18,
  drop: 0.03,
  reach: 96,
} as const;

export const POOL = { length: 5.4, depth: 2.4, lift: 0.03, reach: 54, edge: 0.15 } as const;
export const HALO = { length: 5, depth: 1.3, drop: 0.05 } as const;

export const FRONT_CUT = {
  nosing: 0.06,
  nosingRise: 0.012,
  slab: 0.15,
  plenumInset: 0.3,
} as const;
export const SUBFAB_COLUMN = { size: 0.3, pitch: 4.5, reach: 60, rowsZ: [2.5, 0, -2.5] } as const;

export const RAIL = {
  z: -8.2,
  y: 7.7,
  width: 0.14,
  height: 0.2,
  hanger: 0.05,
  hangerPitch: 4.8,
  reach: 96,
} as const;
export const CARRIER = {
  count: 4,
  speed: 1.4,
  from: -84,
  to: 84,
  phase: 0.5,
} as const;

export const TOOL = { depth: 2.8, gap: 2.6, reach: 66 } as const;
export const TOOL_LENGTHS: readonly number[] = [5.6, 4.4, 6.4, 5];
export const TOOL_HEIGHTS: readonly number[] = [2.6, 2.2, 2.8, 2.4];
export const TOOL_TINTS: readonly number[] = [1, 0.86, 0.94, 0.8];

export interface ToolRowSpec {
  readonly start: number;
  readonly direction: 1 | -1;
  readonly frontZ: number;
  readonly phase: number;
}

export const TOOL_ROWS: readonly ToolRowSpec[] = [
  { start: -12.8, direction: -1, frontZ: 0.4, phase: 1 },
  { start: 11.8, direction: 1, frontZ: 0.4, phase: 2 },
  { start: -TOOL.reach, direction: 1, frontZ: -9.4, phase: 0 },
  { start: TOOL.reach, direction: -1, frontZ: -13.8, phase: 3 },
];

export const LAMP = { size: 0.12, pitch: 0.14, inset: 0.35, lift: 0.2, proud: 0.04 } as const;
export const WALL_LAMPS = { pitch: 7.2, height: 1.7, reach: 60, proud: 0.02 } as const;
export const WALL_WINDOWS = {
  pitch: 9.6,
  reach: 72,
  width: 3.4,
  height: 1.2,
  y: 4.3,
  proud: 0.03,
} as const;
