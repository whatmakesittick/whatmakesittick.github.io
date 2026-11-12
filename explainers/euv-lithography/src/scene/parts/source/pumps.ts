import type { Point } from '../../../ids';
import type { Batch } from '../fab/batch';
import { AXIS_Y as UP, bar, block, disc, rod, runPipe } from '../fab/shapes';
import { GENERATOR } from './dims';
import { radialDirection, surfacePoint } from './ports';

const GROUP = 'vessel';
const PUMP_ANGLE = -100;
const PUMP_X: readonly number[] = [-3.4, -1.7];
const START = 0.85;
const SPOOL_END = 1.05;
const VALVE_END = 1.4;
const BODY_END = 1.95;
const DOME_END = 2.12;
const SPOOL_R = 0.2;
const FLANGE_R = 0.3;
const BODY_R = 0.19;
const FIN_R = 0.215;
const FINS = 6;
const POST_OFFSET = 0.26;
const POST_SIZE = 0.1;
const TRAY_Y = 0.62;
const TRAY_Z = -1;
const TRAY_RANGE: readonly [number, number] = [-4.7, -0.9];
const TRAY_WIDTH = 0.26;
const CABLE_R = 0.02;

function along(x: number, distance: number): Point {
  return surfacePoint(x, PUMP_ANGLE, distance);
}

function pump(batch: Batch, x: number): void {
  const direction = radialDirection(PUMP_ANGLE);
  batch.add(GROUP, 'frame', rod(along(x, START), along(x, SPOOL_END), SPOOL_R, 18));
  batch.add(GROUP, 'flange', disc(along(x, SPOOL_END + 0.02), direction, FLANGE_R, 0.04));
  batch.boltRing(GROUP, along(x, SPOOL_END + 0.04), direction, FLANGE_R * 0.84, 12, 0.018);
  batch.add(
    GROUP,
    'darkFrame',
    bar(along(x, SPOOL_END + 0.04), along(x, VALVE_END - 0.04), 0.36, 0.3),
  );
  const wheel = along(x, (SPOOL_END + VALVE_END) / 2);
  batch.add(GROUP, 'accent', disc([wheel[0], wheel[1] + 0.2, wheel[2]], UP, 0.07, 0.025, 14));
  batch.add(GROUP, 'darkFrame', rod(wheel, [wheel[0], wheel[1] + 0.2, wheel[2]], 0.02, 8));
  batch.add(GROUP, 'flange', disc(along(x, VALVE_END + 0.02), direction, FLANGE_R, 0.04));
  batch.add(GROUP, 'panel', rod(along(x, VALVE_END + 0.04), along(x, BODY_END), BODY_R, 20));
  for (let fin = 0; fin < FINS; fin += 1) {
    const distance = VALVE_END + 0.12 + (fin * (BODY_END - VALVE_END - 0.22)) / (FINS - 1);
    batch.add(GROUP, 'flange', disc(along(x, distance), direction, FIN_R, 0.015, 20));
  }
  batch.add(GROUP, 'accent', disc(along(x, BODY_END - 0.05), direction, BODY_R + 0.008, 0.045, 20));
  batch.add(GROUP, 'darkFrame', rod(along(x, BODY_END), along(x, DOME_END), BODY_R * 0.8, 18));
  batch.add(GROUP, 'flange', disc(along(x, DOME_END + 0.005), direction, BODY_R * 0.55, 0.02, 14));
}

function frameFor(batch: Batch, x: number): void {
  const [, y, z] = along(x, (BODY_END + VALVE_END) / 2);
  const top = y - BODY_R - 0.02;
  [-1, 1].forEach((side) => {
    const px = x + side * POST_OFFSET;
    batch.add(GROUP, 'darkFrame', block([px, top / 2, z], [POST_SIZE, top, POST_SIZE]));
    batch.add(GROUP, 'frame', block([px, 0.015, z], [0.22, 0.03, 0.22]));
    batch.bolt(GROUP, [px, 0.03, z], UP, 0.02);
  });
  batch.add(GROUP, 'frame', block([x, top + 0.02, z], [POST_OFFSET * 2 + POST_SIZE, 0.05, 0.12]));
  batch.add(GROUP, 'darkFrame', block([x, top + 0.065, z], [0.3, 0.04, 0.2]));
}

function cableTray(batch: Batch): void {
  const [from, to] = TRAY_RANGE;
  const width = TRAY_WIDTH / 2;
  batch.add(GROUP, 'tray', block([(from + to) / 2, TRAY_Y, TRAY_Z], [to - from, 0.03, TRAY_WIDTH]));
  [-1, 1].forEach((side) => {
    const z = TRAY_Z + side * width;
    batch.add(GROUP, 'tray', block([(from + to) / 2, TRAY_Y + 0.03, z], [to - from, 0.06, 0.025]));
  });
  [-0.07, 0.07].forEach((offset) => {
    const start: Point = [from, TRAY_Y + 0.03 + CABLE_R, TRAY_Z + offset];
    const bend: Point = [(from + to) / 2, TRAY_Y + 0.03 + CABLE_R * 2, TRAY_Z + offset];
    const end: Point = [to, TRAY_Y + 0.03 + CABLE_R, TRAY_Z + offset];
    batch.add(GROUP, 'cable', runPipe([start, bend, end], CABLE_R, 0.3));
  });
  [-4.4, -3.4, -2.4, -1.4].forEach((x) => {
    batch.add(GROUP, 'darkFrame', block([x, TRAY_Y - 0.1, TRAY_Z], [0.04, 0.2, 0.04]));
    batch.add(GROUP, 'darkFrame', block([x, TRAY_Y - 0.19, TRAY_Z], [0.04, 0.025, 0.4]));
  });
}

function generatorCable(batch: Batch): void {
  const { x, y } = GENERATOR;
  const lead = runPipe(
    [
      [x + 0.2, y - 0.1, -0.25],
      [x + 0.2, y - 0.1, -1.1],
      [x + 0.2, TRAY_Y + 0.1, -1.1],
      [x + 0.2, TRAY_Y + 0.07, TRAY_Z],
    ],
    CABLE_R,
    0.15,
  );
  batch.add(GROUP, 'cable', lead);
}

export function buildPumps(batch: Batch): void {
  PUMP_X.forEach((x) => {
    pump(batch, x);
    frameFor(batch, x);
  });
  cableTray(batch);
  generatorCable(batch);
}
