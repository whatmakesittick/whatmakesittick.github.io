import type { Point } from '../../../ids';
import { pipe } from '../kit';
import type { Bin } from './geo';
import { studs, circlePoints, ring, rod, slab } from './geo';

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
const COLLAR = { width: 0.03, rise: 0.02 } as const;
const EYE = { boss: 0.045, bossRise: 0.02, inner: 0.025, outer: 0.055, thickness: 0.02 } as const;
const CLAMP = { half: 0.03, thickness: 0.012 } as const;

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

export function addCollar(bin: Bin, lo: Point, hi: Point): void {
  const top = lo[1];
  const lift = top + COLLAR.rise;
  const { width } = COLLAR;
  bin.add(
    'flange',
    slab([lo[0] - width, top, lo[2] - width], [lo[0], lift, hi[2] + width]),
    slab([hi[0], top, lo[2] - width], [hi[0] + width, lift, hi[2] + width]),
    slab([lo[0], top, lo[2] - width], [hi[0], lift, lo[2]]),
    slab([lo[0], top, hi[2]], [hi[0], lift, hi[2] + width]),
  );
}

export function addEye(bin: Bin, base: Point): void {
  const [x, y, z] = base;
  bin.add('machined', rod([x, y, z], [x, y + EYE.bossRise, z], EYE.boss, EYE.boss, 12));
  bin.add(
    'flange',
    ring('z', [x, y + EYE.bossRise + EYE.outer * 0.8, z], EYE.inner, EYE.outer, EYE.thickness),
  );
}

export function addClamp(bin: Bin, centre: Point, reach: number): void {
  const [x, y, z] = centre;
  bin.add(
    'frame',
    slab(
      [x - CLAMP.half, y - CLAMP.thickness / 2, Math.min(z, z + reach)],
      [x + CLAMP.half, y + CLAMP.thickness / 2, Math.max(z, z + reach)],
    ),
  );
}

export function addTopRun(bin: Bin, from: Point, to: Point, radius: number): void {
  bin.add('rail', pipe([from, to], radius));
  const count = Math.max(1, Math.round(Math.abs(to[0] - from[0]) / 0.5));
  for (let step = 0; step <= count; step += 1) {
    const x = from[0] + ((to[0] - from[0]) * step) / count;
    bin.add(
      'frame',
      slab(
        [x - CLAMP.thickness / 2, from[1] - radius - 0.01, from[2] - CLAMP.half],
        [x + CLAMP.thickness / 2, from[1] - radius, from[2] + CLAMP.half],
      ),
    );
  }
}
