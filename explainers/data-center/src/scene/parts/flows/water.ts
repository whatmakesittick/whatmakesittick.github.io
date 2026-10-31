import type { CoolingId, Point } from '../../../ids';
import {
  BUILDING,
  CDU,
  CHIP_ANCHOR,
  ENERGY_PATH,
  MANIFOLD,
  RISER,
  ROOF_Y,
  ROW_PIPE,
  SUBJECT_CDU,
  SUBJECT_ROW,
  WALL_PIPE_X,
  WALL_THICKNESS,
  behind,
} from '../../../model';
import { WATER } from './constants';
import { legPoints } from './track';

type Side = 1 | -1;

const RETURN: Side = 1;
const SUPPLY: Side = -1;
const WALL_X = BUILDING.x[1] - WALL_THICKNESS - WATER.roofPipe.radius - WATER.roofPipe.wallClear;

function flank([x, y, z]: Point, side: Side): Point {
  const { across, up } = WATER.flank;
  return [(x === WALL_PIPE_X ? WALL_X : x) + side * across, y + up, z - side * across];
}

function onRoof([, y]: Point): boolean {
  return y > ROOF_Y;
}

function waterPoints(cooling: CoolingId): Point[] {
  return legPoints(ENERGY_PATH[cooling].filter(({ carrier }) => carrier === 'water'));
}

function liquidSupplyIndoors(): Point[] {
  const [chipX, chipY, chipZ] = CHIP_ANCHOR;
  const riserZ = behind(SUBJECT_ROW, WATER.supply.riserZ);
  const dropX = SUBJECT_CDU.base[0] + CDU.width / 4;
  const dropZ = behind(SUBJECT_ROW, WATER.supply.dropZ);
  const rowZ = ROW_PIPE.z - SUBJECT_ROW.facing * WATER.supply.rowGap;
  const coreY = CDU.height / 2;
  const x = MANIFOLD.supplyX;
  return [
    [RISER.x, RISER.top, riserZ],
    [RISER.x, coreY, riserZ],
    [dropX, coreY, dropZ],
    [dropX, ROW_PIPE.y, dropZ],
    [dropX, ROW_PIPE.y, rowZ],
    [x, ROW_PIPE.y, rowZ],
    [x, ROW_PIPE.y, MANIFOLD.z],
    [x, chipY, MANIFOLD.z],
    [x, chipY, chipZ],
    [chipX, chipY, chipZ],
  ];
}

export function returnRoute(cooling: CoolingId): Point[] {
  const points = waterPoints(cooling);
  if (cooling === 'liquid') {
    return points.map((point) => (onRoof(point) ? flank(point, RETURN) : point));
  }
  return points.map((point, index) => (index === 0 ? point : flank(point, RETURN)));
}

export function supplyRoute(cooling: CoolingId): Point[] {
  const back = [...waterPoints(cooling)].reverse();
  if (cooling === 'liquid') {
    return [...back.filter(onRoof).map((point) => flank(point, SUPPLY)), ...liquidSupplyIndoors()];
  }
  const last = back.length - 1;
  return back.map((point, index) => (index === last ? point : flank(point, SUPPLY)));
}
