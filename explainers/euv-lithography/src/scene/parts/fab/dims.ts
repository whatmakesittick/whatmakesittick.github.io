import type { Point } from '../../../ids';
import { DRIVE_LASER_ROOM } from '../../../model/layout';
import { boxSpan } from '../../../model/scale';

export const FLOOR = { minX: -9, maxX: 8, minZ: -3, maxZ: 3 } as const;
export const TILE_TOP = -0.05;
export const PLENUM_BOTTOM = -0.2;
export const SLAB_BOTTOM = -0.35;
export const SUBFLOOR_TOP = -3.5;
export const SUBFLOOR_THICKNESS = 0.2;
export const TILE_M = 0.6;
export const NOSING_WIDTH = 0.06;
export const NOSING_RISE = 0.012;
export const PANEL_THICKNESS = 0.03;
export const PEDESTAL_PITCH = 0.6;
export const PEDESTAL_ROWS: readonly number[] = [2.7, 2.1];
export const PEDESTAL_RADIUS = 0.03;

export const HATCH = { x: -6.5, z: 0, half: 0.55, frame: 0.12, lidTilt: 1.75 } as const;
export const RAIL = {
  minX: -7.45,
  maxX: -5.6,
  halfZ: 0.95,
  heights: [0.9, 0.45],
  post: 0.04,
} as const;
export const SHAFT_WALL = 0.02;

export const ROOM = boxSpan(DRIVE_LASER_ROOM);
export const ROOM_WALL = 0.1;
export const PLINTH_HEIGHT = 0.3;
export const PLINTH_MARGIN = 0.1;
export const ROOM_DOOR = { halfWidth: 1.1, sill: 0.15, lintel: 0.3 } as const;
export const ROOF_PORT = { x: -6.5, z: 0, half: 0.25, collar: 0.22 } as const;

export const COLUMN_SIZE = 0.3;
export const COLUMN_X: readonly number[] = [-8.5, -4, 0, 4, 7.5];
export const COLUMN_Z: readonly number[] = [-2.5, 0, 2.5];
export const WALL_THICKNESS = 0.15;
export const BEAM_DEPTH = 0.25;
export const UTILITY_Z = -2.62;
export const RUN_MIN_X = -8.85;
export const RUN_MAX_X = 7.85;

export const ORIGIN: Point = [0, 0, 0];
