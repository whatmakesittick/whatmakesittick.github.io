import type { Point } from '../../../ids';
import { BUILDING, GENSET, GENSETS, ROOF_Y, WALL_THICKNESS } from '../../../model';

export const GRASS_Y = -0.12;
export const YARD_Y = -0.06;
export const PAD_TOP_Y = 0;

export const ROOF_SLAB_M = 0.3;
export const ROOF_SLAB_Y = ROOF_Y - ROOF_SLAB_M;
export const PARAPET_M = 0.9;

export const ROOF_GIRDER = { width: 0.3, depth: 0.5, pitch: 6 } as const;
export const ROOF_GIRDER_TOP_Y = ROOF_SLAB_Y;

const GIRDER_SPANS = (BUILDING.x[1] - BUILDING.x[0]) / ROOF_GIRDER.pitch;

export const ROOF_GIRDER_X: readonly number[] = Array.from(
  { length: GIRDER_SPANS - 1 },
  (_, index) => BUILDING.x[0] + (index + 1) * ROOF_GIRDER.pitch,
);

export const INNER_WALL = {
  west: BUILDING.x[0] + WALL_THICKNESS,
  east: BUILDING.x[1] - WALL_THICKNESS,
  north: BUILDING.z[0] + WALL_THICKNESS,
  south: BUILDING.z[1] - WALL_THICKNESS,
} as const;

export const GENSET_STACK = { offsetX: 2.6, radius: 0.16, topY: 4.4 } as const;

export const GENSET_STACK_TIPS: readonly Point[] = GENSETS.map(({ base: [x, , z] }) => [
  x + GENSET_STACK.offsetX,
  GENSET_STACK.topY,
  z,
]);

export const GENSET_SHAKE_M = 0.008;
export const GENSET_LENGTH_M = GENSET.width;
