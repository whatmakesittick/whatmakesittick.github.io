import { LineCurve3, QuadraticBezierCurve3, TubeGeometry, Vector3 } from 'three';
import type { BufferGeometry, Curve, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Extent } from '@core/scene/regions';
import type { Point } from '../../../ids';
import { BATTERIES, MV_ENTRY, ROOM_TRAY_Y, SWITCHGEAR, UPS, spanning } from '../../../model';
import type { BoxSpec } from '../../../model';
import { groupMesh } from '../context';
import type { PartContext } from '../context';
import { ROOF_GIRDER, ROOF_GIRDER_TOP_Y, ROOF_GIRDER_X } from './constants';
import { boxes, partGroup } from './kit';
import type { PieceBuilder } from './kit';
import { LINE_UPS, SIDES, around, batteryGlow, lineUp } from './roomCabinets';

type Member = readonly [across: Extent, y: Extent, along: number];

interface Run {
  readonly part: 'switchgear' | 'ups';
  readonly route: readonly Point[];
  readonly tray: { readonly width: number; rise: number; extend: number; pitch: number };
  readonly cable: { readonly radius: number; bend: number; count: number; spread: number };
  members(across: number, bottom: number): Member[];
}

const RAIL = { width: 0.02, depth: 0.06 } as const;
const RUNG = { width: 0.04, depth: 0.025, pitch: 0.3 } as const;
const BEND_STEPS = 6;
const RING = 8;
const BAR_M = 0.04;
const ROD = { size: 0.016, offset: 0.33 } as const;
const STAND_M = 0.05;
const GLAND = { width: 0.56, depth: 0.3, height: 0.14 } as const;
const FLOOR_TRAY_M = 0.3;
const CABLE_TURN_M = 1;
const WALL_SLEEVE_M = 0.2;
const CABINET_ENTRY_M = 0.2;
const LABEL_LIFT_M = 0.3;

const [DROP_X, CABINET_FOOT, SWITCHGEAR_Z] = SWITCHGEAR.base;
const CABINET_TOP = CABINET_FOOT + SWITCHGEAR.size[1];
const CABINET_WEST = DROP_X - SWITCHGEAR.size[0] / 2;
const GLAND_TOP = CABINET_TOP + GLAND.height;
const UPS_Z = UPS.base[2];
const [MV_X, MV_Y, MV_Z] = MV_ENTRY;
const AISLE_X = MV_X + CABLE_TURN_M;

const HANGER_TOP = ROOF_GIRDER_TOP_Y - ROOF_GIRDER.depth;
const HANGER_GIRDER = ROOF_GIRDER_X.reduce((best, x) =>
  Math.abs(x - DROP_X) < Math.abs(best - DROP_X) ? x : best,
);

function rod(x: number, bottom: number): Member {
  return [around(x, ROD.size), [bottom, HANGER_TOP], ROD.size];
}

function strut(x: number): Member {
  const reach = ROD.offset + BAR_M;
  const flange = ROOF_GIRDER.width / 2;
  return [
    [Math.min(x - reach, HANGER_GIRDER - flange), Math.max(x + reach, HANGER_GIRDER + flange)],
    [HANGER_TOP - BAR_M, HANGER_TOP],
    BAR_M,
  ];
}

const RUNS: readonly Run[] = [
  {
    part: 'ups',
    route: [GLAND_TOP, ROOM_TRAY_Y, ROOM_TRAY_Y, GLAND_TOP].map((y, index): Point => [
      DROP_X,
      y,
      index < 2 ? SWITCHGEAR_Z : UPS_Z,
    ]),
    tray: { width: 0.6, rise: 0.06, extend: -0.15, pitch: 2.1 },
    cable: { radius: 0.035, bend: 0.12, count: 5, spread: 0.1 },
    members: (x, bottom) => [
      [around(x, 2 * (ROD.offset + BAR_M)), [bottom - BAR_M, bottom], BAR_M],
      ...SIDES.map((side) => rod(x + side * ROD.offset, bottom)),
      strut(x),
    ],
  },
  {
    part: 'switchgear',
    route: [
      [MV_X + WALL_SLEEVE_M, MV_Y, MV_Z],
      [AISLE_X, MV_Y, MV_Z],
      [AISLE_X, MV_Y, SWITCHGEAR_Z],
      [CABINET_WEST + CABINET_ENTRY_M, MV_Y, SWITCHGEAR_Z],
    ],
    tray: { width: FLOOR_TRAY_M, rise: 0, extend: FLOOR_TRAY_M / 2, pitch: 1.5 },
    cable: { radius: 0.055, bend: 0.25, count: 1, spread: 0 },
    members: (x, bottom) => [
      [around(x, FLOOR_TRAY_M), [bottom - BAR_M, bottom], STAND_M],
      [around(x, STAND_M), [0, bottom - BAR_M], STAND_M],
    ],
  },
];

function trayBoxes({ route, tray, cable, members }: Run): BoxSpec[] {
  const { width, rise, extend, pitch } = tray;
  const top = route[1][1] - cable.radius;
  const bottom = top - RAIL.depth;
  const legs = route.slice(1).map((to, index) => [route[index], to] as const);
  return legs.flatMap(([from, to]) => {
    if (from[1] !== to[1]) return [];
    const alongX = from[2] === to[2];
    const axis = alongX ? 0 : 2;
    const start = Math.min(from[axis], to[axis]) - extend;
    const length = Math.abs(to[axis] - from[axis]) + 2 * extend;
    const across = alongX ? from[2] : from[0];
    const box = ([side, y, size]: Member, at: number) =>
      alongX ? spanning(around(at, size), y, side) : spanning(side, y, around(at, size));
    const spots = (step: number) => {
      const count = Math.max(1, Math.round(length / step));
      return Array.from({ length: count }, (_, index) => start + ((index + 0.5) * length) / count);
    };
    const rail = (side: number) => around(across + (side * (width - RAIL.width)) / 2, RAIL.width);
    const rung: Member = [around(across, width), [top - RUNG.depth, top], RUNG.width];
    const supports = members(across, bottom);
    return [
      ...SIDES.map((side) => box([rail(side), [bottom, top + rise], length], start + length / 2)),
      ...spots(RUNG.pitch).map((at) => box(rung, at)),
      ...spots(pitch).flatMap((at) => supports.map((member) => box(member, at))),
    ];
  });
}

function cableGeometry(route: readonly Point[], { radius, bend }: Run['cable']): BufferGeometry[] {
  const tube = (path: Curve<Vector3>, steps = 1) => new TubeGeometry(path, steps, radius, RING);
  const pieces: BufferGeometry[] = [];
  let start = new Vector3(...route[0]);
  route.slice(1).forEach((point, index) => {
    const corner = new Vector3(...point);
    const next = route[index + 2];
    if (!next) return void pieces.push(tube(new LineCurve3(start, corner)));
    const inbound = start.clone().sub(corner).setLength(bend).add(corner);
    const outbound = new Vector3(...next).sub(corner).setLength(bend).add(corner);
    pieces.push(tube(new LineCurve3(start, inbound)));
    pieces.push(tube(new QuadraticBezierCurve3(inbound, corner, outbound), BEND_STEPS));
    start = outbound;
  });
  return pieces;
}

function buildRuns(context: PartContext, parents: Record<Run['part'], Object3D>): void {
  RUNS.forEach((run) => {
    const { count, spread } = run.cable;
    const routes = Array.from({ length: count }, (_, index) =>
      run.route.map(([x, y, z]): Point => [x + (index - (count - 1) / 2) * spread, y, z]),
    );
    const cables = mergeGeometries(routes.flatMap((route) => cableGeometry(route, run.cable)));
    parents[run.part].add(groupMesh(context, cables, run.part, 'cable'));
    boxes(context, run.part, 'traySteel', trayBoxes(run), parents[run.part]);
  });
  const glands = [SWITCHGEAR_Z, UPS_Z].map((z) =>
    spanning(around(DROP_X, GLAND.width), [CABINET_TOP, GLAND_TOP], around(z, GLAND.depth)),
  );
  boxes(context, 'ups', 'steelDark', glands, parents.ups);
}

export const buildElectricalRoom: PieceBuilder = (context, root) => {
  const label = ({ base: [x, , z] }: BoxSpec): Point => [x, ROOM_TRAY_Y + LABEL_LIFT_M, z];
  const parents = {
    switchgear: partGroup(context, 'switchgear', root, label(SWITCHGEAR)),
    ups: partGroup(context, 'ups', root, label(UPS)),
    batteries: partGroup(context, 'batteries', root, label(BATTERIES)),
  };
  const [glow, show] = batteryGlow(context);
  LINE_UPS.forEach((kind) => lineUp(context, kind, parents[kind.part], glow));
  buildRuns(context, parents);
  let shown = 0;
  return {
    animate({ outage }) {
      if (outage.batteryShare === shown) return false;
      shown = outage.batteryShare;
      show(shown);
      return true;
    },
  };
};
