import type { Point } from '../../../ids';
import {
  COLUMN_M,
  COLUMN_TIE_Y,
  COLUMN_TOP_Y,
  COLUMN_XS,
  COLUMN_ZS,
  PROJECTION,
  PROJECTION_LEG_INSET_M,
  PROJECTION_LEG_M,
} from './dims';
import type { Bin } from './geo';
import { rod, slab } from './geo';
import { legs } from './skin';

const CAP_M = 0.14;
const CAP_THICKNESS_M = 0.015;
const TIE_M = 0.03;
const BRACE_RADIUS = 0.012;
const BASE_PLATE_M = 0.12;
const HALF = COLUMN_M / 2;

const { min, max } = PROJECTION;

function addColumns(bin: Bin): void {
  COLUMN_XS.forEach((x) =>
    COLUMN_ZS.forEach((z) => {
      bin
        .add('darkFrame', slab([x - HALF, max[1], z - HALF], [x + HALF, COLUMN_TOP_Y, z + HALF]))
        .add(
          'flange',
          slab(
            [x - CAP_M / 2, COLUMN_TOP_Y - CAP_THICKNESS_M, z - CAP_M / 2],
            [x + CAP_M / 2, COLUMN_TOP_Y, z + CAP_M / 2],
          ),
        )
        .add(
          'flange',
          slab(
            [x - BASE_PLATE_M / 2, max[1], z - BASE_PLATE_M / 2],
            [x + BASE_PLATE_M / 2, max[1] + CAP_THICKNESS_M, z + BASE_PLATE_M / 2],
          ),
        );
    }),
  );
}

function addTies(bin: Bin): void {
  const [xLow, xHigh] = [COLUMN_XS[0], COLUMN_XS[COLUMN_XS.length - 1]];
  const [zLow, zHigh] = [COLUMN_ZS[0], COLUMN_ZS[COLUMN_ZS.length - 1]];
  const y = COLUMN_TIE_Y;
  const half = TIE_M / 2;
  bin.add('darkFrame', slab([xLow, y - half, zLow - half], [xHigh, y + half, zLow + half]));
  [xLow, xHigh].forEach((x) =>
    bin.add('darkFrame', slab([x - half, y - half, zLow], [x + half, y + half, zHigh])),
  );
  const braces: [Point, Point][] = [
    [
      [xLow, max[1], zLow],
      [xHigh, y, zLow],
    ],
    [
      [xHigh, max[1], zLow],
      [xLow, y, zLow],
    ],
  ];
  braces.forEach(([from, to]) => bin.add('frame', rod(from, to, BRACE_RADIUS)));
}

export function addSupports(bin: Bin): void {
  const xs = [min[0] + PROJECTION_LEG_INSET_M, max[0] - PROJECTION_LEG_INSET_M];
  const zs = [min[2] + PROJECTION_LEG_INSET_M, max[2] - PROJECTION_LEG_INSET_M];
  legs(bin, xs, zs, min[1], PROJECTION_LEG_M);
  addColumns(bin);
  addTies(bin);
}
