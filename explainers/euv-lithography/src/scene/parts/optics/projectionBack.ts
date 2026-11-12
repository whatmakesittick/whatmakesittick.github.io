import type { Object3D } from 'three';
import type { Point } from '../../../ids';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { PartContext } from '../context';
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
import type { Bin } from './geo';
import { bolts, circlePoints, ring, rod, slab } from './geo';

const BACK_Z = PROJECTION.min[2];
const SEAM_DEPTH = 0.008;
const SEAM_WIDTH = 0.012;
const HATCH_RIM = 0.012;
const HATCH_DEPTH = 0.012;
const HATCH_BOLT_INSET = 0.016;
const PUMP_PORT_OUTER = 0.2;
const PUMP_PORT_INNER = 0.06;
const PUMP_BODY = { end: -1.12, radius: 0.12, motorEnd: -1.3, motorRadius: 0.1 } as const;
const PUMP_FINS = [-0.92, -0.99, -1.06] as const;
const FINS = { inner: 0.05, outer: 0.135, thickness: 0.012 } as const;
const PUMP_BOLTS = 8;
const FORELINE = { z: -1.45, floorY: 0.2, radius: 0.03, bend: 0.12, sideX: [4.0, 3.6] } as const;
const COOLANT = { radius: 0.022, lowY: 0.85, highY: 3.2, offset: -0.93, wall: -0.83 } as const;
const COOLANT_FINISH = ['copper', 'accent'] as const;
const CLAMP_YS = [1.3, 1.9, 2.8] as const;
const CLAMP_HALF = 0.03;
const CLAMP_THICKNESS = 0.012;
const TRAY = { halfHeight: 0.08, depth: 0.1, lip: 0.02, rungStep: 0.12, rungWidth: 0.014 } as const;
const CABLE_YS = [-0.04, 0, 0.04] as const;
const CABLE_RADIUS = 0.012;
const CABLE_Z = -0.85;
const VALVE_HALF = 0.09;

function addSeams(bin: Bin): void {
  const { min, max } = PROJECTION;
  RIB_XS.forEach((x) =>
    bin.add(
      'darkFrame',
      slab(
        [x - SEAM_WIDTH / 2, min[1] + 0.05, BACK_Z - SEAM_DEPTH],
        [x + SEAM_WIDTH / 2, max[1] - 0.05, BACK_Z],
      ),
    ),
  );
  RIB_YS.forEach((y) =>
    bin.add(
      'darkFrame',
      slab(
        [min[0] + 0.05, y - SEAM_WIDTH / 2, BACK_Z - SEAM_DEPTH],
        [max[0] - 0.05, y + SEAM_WIDTH / 2, BACK_Z],
      ),
    ),
  );
}

function addHatches(context: PartContext, bin: Bin, parent: Object3D): void {
  const half = HATCH_M / 2;
  const heads: Point[] = [];
  HATCH_CENTRES.forEach(([x, y]) => {
    bin.add(
      'darkFrame',
      slab(
        [x - half - HATCH_RIM, y - half - HATCH_RIM, BACK_Z - HATCH_DEPTH / 2],
        [x + half + HATCH_RIM, y + half + HATCH_RIM, BACK_Z],
      ),
    );
    bin.add(
      'hatch',
      slab(
        [x - half, y - half, BACK_Z - HATCH_DEPTH],
        [x + half, y + half, BACK_Z - HATCH_DEPTH / 2],
      ),
    );
    bin.add(
      'flange',
      slab(
        [x - 0.05, y - 0.008, BACK_Z - HATCH_DEPTH - 0.012],
        [x + 0.05, y + 0.008, BACK_Z - HATCH_DEPTH],
      ),
    );
    const reach = half - HATCH_BOLT_INSET;
    [-1, 1].forEach((sx) =>
      [-1, 1].forEach((sy) => heads.push([x + sx * reach, y + sy * reach, BACK_Z - HATCH_DEPTH])),
    );
  });
  parent.add(bolts(context, STRUCTURE_GROUP, 'z', heads));
}

function addPump(
  context: PartContext,
  bin: Bin,
  parent: Object3D,
  centre: Point,
  sideX: number,
): void {
  const [x, y] = centre;
  const port: Point = [x, y, BACK_Z - 0.01];
  bin.add('flange', ring('z', port, PUMP_PORT_INNER, PUMP_PORT_OUTER, 0.02));
  const body = PUMP_BODY;
  bin.add('laserCase', rod([x, y, BACK_Z - 0.02], [x, y, body.end], body.radius));
  bin.add(
    'darkFrame',
    rod([x, y, body.end], [x, y, body.motorEnd], body.motorRadius, body.motorRadius * 0.8),
  );
  PUMP_FINS.forEach((z) =>
    bin.add('flange', ring('z', [x, y, z], FINS.inner, FINS.outer, FINS.thickness)),
  );
  const route: Point[] = [
    [x, y, body.motorEnd],
    [x, y, FORELINE.z],
    [sideX, y, FORELINE.z],
    [sideX, FORELINE.floorY, FORELINE.z],
  ];
  const straight = sideX === x ? [route[0], route[1], route[3]] : route;
  bin.add('tray', pipe(straight, FORELINE.radius, FORELINE.bend));
  bin.add(
    'darkFrame',
    slab(
      [sideX - VALVE_HALF, 0.02, FORELINE.z - VALVE_HALF],
      [sideX + VALVE_HALF, FORELINE.floorY, FORELINE.z + VALVE_HALF],
      0.01,
    ),
  );
  parent.add(
    bolts(
      context,
      STRUCTURE_GROUP,
      'z',
      circlePoints('z', [x, y, BACK_Z - 0.02], PUMP_PORT_OUTER - 0.025, PUMP_BOLTS),
    ),
  );
}

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

function addTray(bin: Bin): void {
  const { min, max } = PROJECTION;
  const [x0, x1] = [min[0] + 0.06, max[0] - 0.06];
  const { halfHeight, depth, lip, rungStep, rungWidth } = TRAY;
  const [lo, hi] = [TRAY_Y - halfHeight, TRAY_Y + halfHeight];
  bin.add(
    'tray',
    slab([x0, lo, BACK_Z - depth], [x1, lo + lip, BACK_Z]),
    slab([x0, hi - lip, BACK_Z - depth], [x1, hi, BACK_Z]),
  );
  const count = Math.floor((x1 - x0) / rungStep);
  for (let index = 0; index <= count; index += 1) {
    const x = x0 + index * rungStep;
    bin.add('tray', slab([x, lo, BACK_Z - lip], [x + rungWidth, hi, BACK_Z]));
  }
  CABLE_YS.forEach((offset) =>
    bin.add(
      'cable',
      rod(
        [x0 + 0.02, TRAY_Y + offset, CABLE_Z],
        [x1 - 0.02, TRAY_Y + offset, CABLE_Z],
        CABLE_RADIUS,
      ),
    ),
  );
}

export function addBack(context: PartContext, parent: Object3D, bin: Bin): void {
  addSeams(bin);
  addHatches(context, bin, parent);
  PUMP_CENTRES.forEach((centre, index) =>
    addPump(context, bin, parent, centre, FORELINE.sideX[index]),
  );
  addCoolant(bin);
  addTray(bin);
}
