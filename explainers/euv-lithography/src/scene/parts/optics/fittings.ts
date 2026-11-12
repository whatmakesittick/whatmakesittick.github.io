import type { Point } from '../../../ids';
import { pipe } from '../kit';
import type { Bin } from './geo';
import { studs, circlePoints, ring, rod, slab } from './geo';

const SEAM_DEPTH = 0.008;
const SEAM_WIDTH = 0.012;
const SEAM_EDGE = 0.05;
const HATCH_RIM = 0.012;
const HATCH_DEPTH = 0.012;
const HATCH_BOLT_INSET = 0.016;
const PUMP_PORT_OUTER = 0.2;
const PUMP_PORT_INNER = 0.06;
const PUMP_BODY = { end: -0.32, radius: 0.12, motorEnd: -0.5, motorRadius: 0.1 } as const;
const PUMP_FINS = [-0.12, -0.19, -0.26] as const;
const FINS = { inner: 0.05, outer: 0.135, thickness: 0.012 } as const;
const PUMP_BOLTS = 8;
const FORELINE = { z: -0.65, floorY: 0.2, radius: 0.03, bend: 0.12 } as const;
const TRAY = { halfHeight: 0.08, depth: 0.1, lip: 0.02, rungStep: 0.12, rungWidth: 0.014 } as const;
const CABLE_YS = [-0.04, 0, 0.04] as const;
const CABLE_RADIUS = 0.012;
const CABLE_Z = -0.05;
const VALVE_HALF = 0.09;

export interface SeamGrid {
  readonly xs: readonly number[];
  readonly ys: readonly number[];
  readonly x: readonly [number, number];
  readonly y: readonly [number, number];
}

export function addSeams(bin: Bin, z: number, grid: SeamGrid): void {
  const [x0, x1] = grid.x;
  const [y0, y1] = grid.y;
  grid.xs.forEach((x) =>
    bin.add(
      'darkFrame',
      slab(
        [x - SEAM_WIDTH / 2, y0 + SEAM_EDGE, z - SEAM_DEPTH],
        [x + SEAM_WIDTH / 2, y1 - SEAM_EDGE, z],
      ),
    ),
  );
  grid.ys.forEach((y) =>
    bin.add(
      'darkFrame',
      slab(
        [x0 + SEAM_EDGE, y - SEAM_WIDTH / 2, z - SEAM_DEPTH],
        [x1 - SEAM_EDGE, y + SEAM_WIDTH / 2, z],
      ),
    ),
  );
}

export function addHatches(bin: Bin, z: number, centres: readonly Point[], size: number): void {
  const half = size / 2;
  const heads: Point[] = [];
  centres.forEach(([x, y]) => {
    bin.add(
      'darkFrame',
      slab(
        [x - half - HATCH_RIM, y - half - HATCH_RIM, z - HATCH_DEPTH / 2],
        [x + half + HATCH_RIM, y + half + HATCH_RIM, z],
      ),
    );
    bin.add(
      'hatch',
      slab([x - half, y - half, z - HATCH_DEPTH], [x + half, y + half, z - HATCH_DEPTH / 2]),
    );
    bin.add(
      'flange',
      slab([x - 0.05, y - 0.008, z - HATCH_DEPTH - 0.012], [x + 0.05, y + 0.008, z - HATCH_DEPTH]),
    );
    const reach = half - HATCH_BOLT_INSET;
    [-1, 1].forEach((sx) =>
      [-1, 1].forEach((sy) => heads.push([x + sx * reach, y + sy * reach, z - HATCH_DEPTH])),
    );
  });
  studs(bin, 'z', heads);
}

export function addPump(bin: Bin, z: number, centre: Point, sideX: number): void {
  const [x, y] = centre;
  const port: Point = [x, y, z - 0.01];
  bin.add('flange', ring('z', port, PUMP_PORT_INNER, PUMP_PORT_OUTER, 0.02));
  const body = PUMP_BODY;
  bin.add('laserCase', rod([x, y, z - 0.02], [x, y, z + body.end], body.radius));
  bin.add(
    'darkFrame',
    rod([x, y, z + body.end], [x, y, z + body.motorEnd], body.motorRadius, body.motorRadius * 0.8),
  );
  PUMP_FINS.forEach((offset) =>
    bin.add('flange', ring('z', [x, y, z + offset], FINS.inner, FINS.outer, FINS.thickness)),
  );
  const route: Point[] = [
    [x, y, z + body.motorEnd],
    [x, y, z + FORELINE.z],
    [sideX, y, z + FORELINE.z],
    [sideX, FORELINE.floorY, z + FORELINE.z],
  ];
  const straight = sideX === x ? [route[0], route[1], route[3]] : route;
  bin.add('tray', pipe(straight, FORELINE.radius, FORELINE.bend));
  bin.add(
    'darkFrame',
    slab(
      [sideX - VALVE_HALF, 0.02, z + FORELINE.z - VALVE_HALF],
      [sideX + VALVE_HALF, FORELINE.floorY, z + FORELINE.z + VALVE_HALF],
      0.01,
    ),
  );
  studs(bin, 'z', circlePoints('z', [x, y, z - 0.02], PUMP_PORT_OUTER - 0.025, PUMP_BOLTS));
}

export function addTray(bin: Bin, z: number, x0: number, x1: number, trayY: number): void {
  const { halfHeight, depth, lip, rungStep, rungWidth } = TRAY;
  const [lo, hi] = [trayY - halfHeight, trayY + halfHeight];
  bin.add(
    'tray',
    slab([x0, lo, z - depth], [x1, lo + lip, z]),
    slab([x0, hi - lip, z - depth], [x1, hi, z]),
  );
  const count = Math.floor((x1 - x0) / rungStep);
  for (let index = 0; index <= count; index += 1) {
    const x = x0 + index * rungStep;
    bin.add('tray', slab([x, lo, z - lip], [x + rungWidth, hi, z]));
  }
  CABLE_YS.forEach((offset) =>
    bin.add(
      'cable',
      rod(
        [x0 + 0.02, trayY + offset, z + CABLE_Z],
        [x1 - 0.02, trayY + offset, z + CABLE_Z],
        CABLE_RADIUS,
      ),
    ),
  );
}
