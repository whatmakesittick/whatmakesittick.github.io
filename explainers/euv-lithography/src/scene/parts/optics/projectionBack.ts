import type { Point } from '../../../ids';
import { pipe } from '../kit';
import {
  HATCH_CENTRES,
  HATCH_M,
  PIPE_XS,
  PROJECTION,
  PUMP_CENTRES,
  RIB_XS,
  RIB_YS,
  TRAY_Y,
} from './dims';
import { addHatches, addPump, addSeams, addTray } from './fittings';
import type { Bin } from './geo';
import { ring, slab } from './geo';

const BACK_Z = PROJECTION.min[2];
const PUMP_SIDES: readonly number[] = [4.0, 3.6];
const TRAY_INSET = 0.06;

const COOLANT = { radius: 0.022, lowY: 0.85, highY: 3.2, offset: -0.93, wall: -0.83 } as const;
const COOLANT_FINISH = ['copper', 'accent'] as const;
const CLAMP_YS = [1.3, 1.9, 2.8] as const;
const CLAMP_HALF = 0.03;
const CLAMP_THICKNESS = 0.012;

function addCoolant(bin: Bin): void {
  PIPE_XS.forEach((x, index) => {
    const route: Point[] = [
      [x, COOLANT.lowY, COOLANT.wall],
      [x, COOLANT.lowY, COOLANT.offset],
      [x, COOLANT.highY, COOLANT.offset],
      [x, COOLANT.highY, COOLANT.wall],
    ];
    bin.add(COOLANT_FINISH[index], pipe(route, COOLANT.radius, COOLANT.radius * 3));
    [COOLANT.lowY, COOLANT.highY].forEach((y) =>
      bin.add('flange', ring('z', [x, y, BACK_Z - 0.012], 0, 0.04, 0.02)),
    );
    CLAMP_YS.forEach((y) =>
      bin.add(
        'frame',
        slab(
          [x - CLAMP_HALF, y - CLAMP_THICKNESS / 2, COOLANT.offset],
          [x + CLAMP_HALF, y + CLAMP_THICKNESS / 2, BACK_Z],
        ),
      ),
    );
  });
}

export function addBack(bin: Bin): void {
  const { min, max } = PROJECTION;
  addSeams(bin, BACK_Z, { xs: RIB_XS, ys: RIB_YS, x: [min[0], max[0]], y: [min[1], max[1]] });
  addHatches(bin, BACK_Z, HATCH_CENTRES, HATCH_M);
  PUMP_CENTRES.forEach((centre, index) => addPump(bin, BACK_Z, centre, PUMP_SIDES[index]));
  addCoolant(bin);
  addTray(bin, BACK_Z, min[0] + TRAY_INSET, max[0] - TRAY_INSET, TRAY_Y);
}
