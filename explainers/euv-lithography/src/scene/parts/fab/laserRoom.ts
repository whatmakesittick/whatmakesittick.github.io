import type { Vector3 } from 'three';
import type { Point } from '../../../ids';
import { AXIS_Y, span, washer } from './shapes';
import type { Batch } from './batch';
import {
  PLINTH_HEIGHT,
  PLINTH_MARGIN,
  ROOF_PORT,
  ROOM,
  ROOM_DOOR,
  ROOM_WALL,
  SUBFLOOR_TOP,
} from './dims';

const GROUP = 'driveLaser';
const POST = 0.08;
const TRIM = 0.07;
const TRIM_DEPTH = 0.045;
const STRIPE = 0.018;
const SEAM_PITCH = 0.6;
const SEAM = 0.016;
const COLLAR_RISE = 0.08;
const COLLAR_OUTER = 0.22;
const COLLAR_INNER = 0.125;
const COLLAR_BOLTS = 8;
const COLLAR_BOLT_SIZE = 0.016;

type Corners = [Point, Point];

function wall(batch: Batch, [min, max]: Corners): void {
  batch.add(GROUP, 'wall', span(min, max));
}

function trim(batch: Batch, finish: 'frame' | 'darkFrame' | 'accent', [min, max]: Corners): void {
  batch.add(GROUP, finish, span(min, max));
}

function plinth(batch: Batch): void {
  const { x, z } = ROOM;
  const top = SUBFLOOR_TOP + PLINTH_HEIGHT;
  const margin = PLINTH_MARGIN;
  batch.add(
    GROUP,
    'darkFrame',
    span([x[0] - margin, SUBFLOOR_TOP, z[0] - margin], [x[1] + margin, top, z[1] + margin]),
  );
  batch.add(
    GROUP,
    'frame',
    span([x[0] - margin, top - 0.04, z[0] - margin], [x[1] + margin, top, z[1] + margin]),
  );
  batch.add(
    GROUP,
    'tray',
    span(
      [x[0] - margin, SUBFLOOR_TOP, z[1]],
      [x[1] + margin, SUBFLOOR_TOP + 0.05, z[1] + margin + 0.02],
    ),
  );
}

function shell(batch: Batch): void {
  const { x, y, z } = ROOM;
  const floor = y[0];
  const roof = y[1];
  wall(batch, [
    [x[0], floor, z[0]],
    [x[1], roof, z[0] + ROOM_WALL],
  ]);
  wall(batch, [
    [x[0], floor, z[0]],
    [x[0] + ROOM_WALL, roof, z[1]],
  ]);
  wall(batch, [
    [x[1] - ROOM_WALL, floor, z[0]],
    [x[1], roof, z[1]],
  ]);
  const ceiling = roof - ROOM_WALL;
  const { x: px, z: pz, half } = ROOF_PORT;
  wall(batch, [
    [x[0], ceiling, z[0]],
    [px - half, roof, z[1]],
  ]);
  wall(batch, [
    [px + half, ceiling, z[0]],
    [x[1], roof, z[1]],
  ]);
  wall(batch, [
    [px - half, ceiling, z[0]],
    [px + half, roof, pz - half],
  ]);
  wall(batch, [
    [px - half, ceiling, pz + half],
    [px + half, roof, z[1]],
  ]);
}

function doorway(batch: Batch): void {
  const { x, y, z } = ROOM;
  const centre = (x[0] + x[1]) / 2;
  const left = centre - ROOM_DOOR.halfWidth;
  const right = centre + ROOM_DOOR.halfWidth;
  const sill = y[0] + ROOM_DOOR.sill;
  const lintel = y[1] - ROOM_DOOR.lintel;
  const depth = z[1] - ROOM_WALL;
  wall(batch, [
    [x[0], y[0], depth],
    [left, y[1], z[1]],
  ]);
  wall(batch, [
    [right, y[0], depth],
    [x[1], y[1], z[1]],
  ]);
  wall(batch, [
    [left, lintel, depth],
    [right, y[1], z[1]],
  ]);
  wall(batch, [
    [left, y[0], depth],
    [right, sill, z[1]],
  ]);
  const front = z[1];
  trim(batch, 'frame', [
    [left - TRIM, sill - TRIM, front],
    [left, lintel + TRIM, front + TRIM_DEPTH],
  ]);
  trim(batch, 'frame', [
    [right, sill - TRIM, front],
    [right + TRIM, lintel + TRIM, front + TRIM_DEPTH],
  ]);
  trim(batch, 'frame', [
    [left, lintel, front],
    [right, lintel + TRIM, front + TRIM_DEPTH],
  ]);
  trim(batch, 'frame', [
    [left, sill - TRIM, front],
    [right, sill, front + TRIM_DEPTH],
  ]);
  trim(batch, 'darkFrame', [
    [left, sill, depth],
    [left + STRIPE * 2, lintel, front + 0.01],
  ]);
  trim(batch, 'darkFrame', [
    [right - STRIPE * 2, sill, depth],
    [right, lintel, front + 0.01],
  ]);
  trim(batch, 'accent', [
    [left, lintel - STRIPE, front],
    [right, lintel, front + TRIM_DEPTH],
  ]);
  trim(batch, 'accent', [
    [left, sill, front],
    [right, sill + STRIPE, front + TRIM_DEPTH],
  ]);
}

function frameworkPosts(batch: Batch): void {
  const { x, y, z } = ROOM;
  [x[0], x[1] - POST].forEach((px) => {
    [z[0], z[1] - POST].forEach((pz) => {
      trim(batch, 'frame', [
        [px, y[0], pz],
        [px + POST, y[1], pz + POST],
      ]);
    });
  });
  trim(batch, 'frame', [
    [x[0], y[1], z[0]],
    [x[1], y[1] + 0.04, z[1]],
  ]);
  trim(batch, 'darkFrame', [
    [x[0], y[0], z[0]],
    [x[1], y[0] + 0.1, z[0] + ROOM_WALL + 0.01],
  ]);
}

function seams(batch: Batch): void {
  const { x, y, z } = ROOM;
  for (let px = x[0] + SEAM_PITCH; px < x[1] - 0.2; px += SEAM_PITCH) {
    trim(batch, 'frame', [
      [px, y[0], z[0] - 0.01],
      [px + SEAM, y[1], z[0]],
    ]);
  }
  for (let pz = z[0] + SEAM_PITCH; pz < z[1] - 0.2; pz += SEAM_PITCH) {
    trim(batch, 'frame', [
      [x[0] - 0.01, y[0], pz],
      [x[0], y[1], pz + SEAM],
    ]);
    trim(batch, 'frame', [
      [x[1], y[0], pz],
      [x[1] + 0.01, y[1], pz + SEAM],
    ]);
  }
}

function roofPort(batch: Batch): void {
  const roof = ROOM.y[1];
  const at: Point = [ROOF_PORT.x, roof + COLLAR_RISE / 2, ROOF_PORT.z];
  const up: Vector3 = AXIS_Y;
  batch.add(GROUP, 'flange', washer(at, up, COLLAR_INNER, ROOF_PORT.collar, COLLAR_RISE));
  batch.add(
    GROUP,
    'darkFrame',
    washer([at[0], roof + 0.01, at[2]], up, COLLAR_INNER, COLLAR_OUTER + 0.07, 0.02),
  );
  const face: Point = [at[0], roof + COLLAR_RISE, at[2]];
  batch.boltRing(
    GROUP,
    face,
    up,
    (COLLAR_INNER + ROOF_PORT.collar) / 2,
    COLLAR_BOLTS,
    COLLAR_BOLT_SIZE,
  );
}

export function buildRoom(batch: Batch): void {
  plinth(batch);
  shell(batch);
  doorway(batch);
  frameworkPosts(batch);
  seams(batch);
  roofPort(batch);
}
