import type { Point } from '../../../ids';
import {
  ENTRY,
  ILLUMINATOR,
  ILLUMINATOR_COLUMN_X,
  ILLUMINATOR_DUCT_Y,
  ILLUMINATOR_SLOT,
  ILLUMINATOR_VIEWS,
  SKIN_M,
  VENEER_M,
} from './dims';
import { plate, slab } from './geo';
import type { Axis, Bin, Cell, Hole } from './geo';
import { paneled } from './skin';

const RIM_M = 0.02;
const RIM_LIFT_M = 0.02;
const COLLAR_M = 0.03;
const COLLAR_PROUD_M = 0.02;
const ACCENT_M = 0.035;
const ACCENT_LIFT_M = 0.03;
const WINDOW_INSET_M = 0.0025;
const ENTRY_HOLE_M = 0.005;
const INDEX = { x: 0, y: 1, z: 2 } as const;

const { min, max } = ILLUMINATOR;
const COLUMN_X = ILLUMINATOR_COLUMN_X;
const DUCT_Y = ILLUMINATOR_DUCT_Y;
const INNER = SKIN_M;

interface Wall {
  readonly axis: Axis;
  readonly side: 1 | -1;
  readonly min: Point;
  readonly max: Point;
  readonly tiles: readonly [number, number];
}

const WALLS: readonly Wall[] = [
  {
    axis: 'y',
    side: -1,
    min: [min[0], min[1], min[2]],
    max: [COLUMN_X, min[1] + INNER, max[2]],
    tiles: [2, 2],
  },
  {
    axis: 'x',
    side: 1,
    min: [COLUMN_X - INNER, min[1] + INNER, min[2]],
    max: [COLUMN_X, DUCT_Y, max[2]],
    tiles: [3, 2],
  },
  {
    axis: 'y',
    side: -1,
    min: [COLUMN_X, DUCT_Y, min[2]],
    max: [max[0], DUCT_Y + INNER, max[2]],
    tiles: [4, 2],
  },
  {
    axis: 'x',
    side: 1,
    min: [max[0] - INNER, DUCT_Y + INNER, min[2]],
    max: [max[0], max[1], max[2]],
    tiles: [2, 1],
  },
  {
    axis: 'z',
    side: -1,
    min: [min[0], min[1], min[2]],
    max: [COLUMN_X, max[1], min[2] + INNER],
    tiles: [2, 4],
  },
  {
    axis: 'z',
    side: -1,
    min: [COLUMN_X, DUCT_Y, min[2]],
    max: [max[0], max[1], min[2] + INNER],
    tiles: [5, 2],
  },
];

function veneerOf(axis: Axis, side: 1 | -1, lo: Point, hi: Point): [Cell, Cell] {
  const index = INDEX[axis];
  const [a, b]: [Cell, Cell] = [[...lo], [...hi]];
  const inside = side > 0 ? lo[index] : hi[index];
  a[index] = side > 0 ? inside - VENEER_M : inside;
  b[index] = side > 0 ? inside : inside + VENEER_M;
  return [a, b];
}

function holed(bin: Bin, axis: Axis, side: 1 | -1, lo: Point, hi: Point, hole: Hole): void {
  bin.add('panelShade', plate(axis, lo, hi, hole));
  const [a, b] = veneerOf(axis, side, lo, hi);
  bin.add('shellInner', plate(axis, a, b, hole));
}

export function addSolidSkins(solid: Bin): void {
  WALLS.forEach((wall) => {
    paneled(solid, wall.axis, wall.side, wall.min, wall.max, wall.tiles);
    const [a, b] = veneerOf(wall.axis, wall.side, wall.min, wall.max);
    solid.add('shellInner', slab(a, b));
  });
  const slot = ILLUMINATOR_SLOT;
  holed(solid, 'y', 1, [min[0], max[1] - INNER, min[2]], max, {
    min: [slot.min[0], max[1], slot.min[2]],
    max: [slot.max[0], max[1], slot.max[2]],
  });
  holed(solid, 'x', -1, min, [min[0] + INNER, max[1], max[2]], {
    centre: [min[0], ENTRY.y, 0],
    radius: ENTRY.radius + ENTRY_HOLE_M,
  });
  addCollar(solid, slot.min, slot.max);
}

function addCollar(solid: Bin, lo: Point, hi: Point): void {
  const lift = max[1] + COLLAR_PROUD_M;
  const top = max[1];
  solid.add(
    'flange',
    slab([lo[0] - COLLAR_M, top, lo[2] - COLLAR_M], [lo[0], lift, hi[2] + COLLAR_M]),
    slab([hi[0], top, lo[2] - COLLAR_M], [hi[0] + COLLAR_M / 2, lift, hi[2] + COLLAR_M]),
    slab([lo[0], top, lo[2] - COLLAR_M], [hi[0], lift, lo[2]]),
    slab([lo[0], top, hi[2]], [hi[0], lift, hi[2] + COLLAR_M]),
  );
}

const [LOW, HIGH] = ILLUMINATOR_VIEWS;
const FRONT_PIECES: readonly (readonly [number, number, number, number])[] = [
  [min[0], min[1], LOW.min[0], max[1]],
  [LOW.min[0], min[1], LOW.max[0], LOW.min[1]],
  [LOW.min[0], LOW.max[1], max[0], max[1]],
  [LOW.max[0], LOW.min[1], COLUMN_X, DUCT_Y],
  [LOW.max[0], DUCT_Y, HIGH.min[0], LOW.max[1]],
  [HIGH.min[0], DUCT_Y, max[0], HIGH.min[1]],
  [HIGH.max[0], HIGH.min[1], max[0], HIGH.max[1]],
];

export function addFrontSkin(front: Bin, glass: Bin, solid: Bin): void {
  const z = max[2];
  FRONT_PIECES.forEach(([x0, y0, x1, y1]) => {
    const [lo, hi]: [Point, Point] = [
      [x0, y0, z - INNER],
      [x1, y1, z],
    ];
    paneled(front, 'z', 1, lo, hi, [Math.max(1, Math.round((x1 - x0) / 0.5)), 1]);
    const [a, b] = veneerOf('z', 1, lo, hi);
    front.add('shellInner', slab(a, b));
  });
  ILLUMINATOR_VIEWS.forEach((view) => {
    glass.add(
      'window',
      slab(
        [view.min[0], view.min[1], z - INNER / 2],
        [view.max[0], view.max[1], z - INNER / 2 + WINDOW_INSET_M],
      ),
    );
    addViewportRim(solid, view.min, view.max, z);
  });
  solid.add(
    'accent',
    slab(
      [min[0], min[1] + ACCENT_LIFT_M, z],
      [COLUMN_X, min[1] + ACCENT_LIFT_M + ACCENT_M, z + 0.006],
    ),
    slab([COLUMN_X, DUCT_Y + 0.01, z], [max[0], DUCT_Y + 0.01 + ACCENT_M / 2, z + 0.006]),
  );
}

function addViewportRim(solid: Bin, lo: Point, hi: Point, z: number): void {
  const [front, back] = [z + RIM_LIFT_M / 2, z - RIM_LIFT_M];
  solid.add(
    'flange',
    slab([lo[0] - RIM_M, lo[1] - RIM_M, back], [hi[0] + RIM_M, lo[1], front]),
    slab([lo[0] - RIM_M, hi[1], back], [hi[0] + RIM_M, hi[1] + RIM_M, front]),
    slab([lo[0] - RIM_M, lo[1], back], [lo[0], hi[1], front]),
    slab([hi[0], lo[1], back], [hi[0] + RIM_M, hi[1], front]),
  );
}
