import type { Matrix4, Object3D } from 'three';
import { lerp } from '@core/math';
import type { PartId, Point } from '../../../ids';
import { ENERGY_PATH, GANTRY, GRID_LINE, MV_ENTRY, TRANSFORMER } from '../../../model';
import { TRANSFORMERS, WAYPOINTS, boxTop } from '../../../model';
import { placement } from '../context';
import type { PartContext } from '../context';
import { GRASS_Y, YARD_Y } from './constants';
import { materialOf, partGroup } from './kit';
import type { CampusPiece, PieceBuilder } from './kit';
import { SUBSTATION, SUBSTATION_GATE, fence, mottled, slab } from './site';
import { adder, cuboid, lattice, polyline, strut, upright } from './substationKit';
import type { Cuboid } from './substationKit';

const PART: PartId = 'substation';
const SIDES = [-1, 1];
const PHASES = [-1, 0, 1];
const TOWER = { pitch: 85, count: 8, gap: 3.4, base: 1.6, top: 0.6, height: 14.2, panels: 10 };
const ARM = { depth: 0.8, overhang: 0.5, panels: 9, peak: 1.8, peakTop: 0.15 };
const WIRE = { diameter: 0.06, sagPerSquareMetre: 0.8 / 38 ** 2, segmentM: 3, string: 0.28 };
const DARK_WIRE = { color: '#34383d', roughness: 0.8, metalness: 0.3 } as const;
const FRAME = { column: [0.6, 0.6], beam: [0.4, 0.4], panel: 1.2, beamPanel: 0.6, overhang: 0.3 };
const STAND = { x: -68, height: 5.2, beam: 0.3, post: 1.0, postDiameter: 0.3 };
const BREAKER = { x: -65.5, height: 2.2, column: 1.6, head: 0.3, diameter: 0.34 };
const TANK = { length: 4.4, depth: 2.7, bottom: 0.2, top: 3.0, lid: 0.08 };
const FIN = { pitch: 0.19, count: 21, depth: 0.6, bottom: 0.45, height: 2.2 };
const HV = { gap: 1.1, diameter: 0.34, turret: 0.46, rise: 0.15, lowX: 0.9, low: 0.55 };
const LV_DIAMETER = 0.24;
const CONSERVATOR = { x: 1.75, y: 3.75, diameter: 0.7, length: 2.0 };
const TRAY = { width: 0.5, plate: 0.03, post: 0.08, pitch: 2 };
const CABLE = { diameter: 0.1, offsets: [-0.12, 0, 0.12] };
const BUS_DIAMETER = 0.07;
const CABLE_GAP_M = 0.6;
const POST_BASE_Y = GRASS_Y - 0.05;
const TRAY_BOTTOM = MV_ENTRY[1] - CABLE.diameter / 2 - TRAY.plate;

const { fromX, toX, y: LINE_Y, z: LINE_Z } = GRID_LINE;
const PHASE_Z = PHASES.map((phase) => LINE_Z + phase * GRID_LINE.conductorGap);
const TOWER_X = Array.from({ length: TOWER.count }, (_, index) => fromX - index * TOWER.pitch);
const STOPS = [...TOWER_X].reverse().concat(toX);
const LEG_Z = SIDES.map((side) => LINE_Z + side * TOWER.gap);
const ARM_Z = SIDES.map((side) => LINE_Z + side * (TOWER.gap + ARM.overhang));
const BAY_Z = SIDES.map((side) => LINE_Z + (side * GANTRY.size[2]) / 2);
const REACH_Z = SIDES.map((side) => LINE_Z + side * (GANTRY.size[2] / 2 + FRAME.overhang));
const GANTRY_TOP_Y = GANTRY.size[1];
const BEAM_Y = GANTRY_TOP_Y - FRAME.beam[0] / 2;
const LID_TOP = TANK.top + TANK.lid;
const TURRET_Y = LID_TOP + HV.rise / 2;
const BUSHING_Y = LID_TOP + HV.rise;
const BEAM_BOTTOM_Y = GANTRY_TOP_Y - FRAME.beam[0];
const [HALF_L, HALF_D] = [TANK.length / 2, TANK.depth / 2];
const [FEEDS, STANDBY] = TRANSFORMERS.map(({ base: [x, , z] }) =>
  PHASES.map((phase): Point => [x, TRANSFORMER.height, z + phase * HV.gap]),
);
const STANDBY_Z = TRANSFORMERS[1].base[2];
const POST_TOP = STAND.height + STAND.beam + STAND.post;
const HEAD_TOP = BREAKER.height + BREAKER.column + BREAKER.head;
const CABLE_LEG = ENERGY_PATH.liquid.find(({ carrier }) => carrier === 'cable');
const ROUTE = CABLE_LEG?.points.slice(0, CABLE_LEG.points.indexOf(WAYPOINTS.mvEntry) + 1) ?? [];

const GALVANISED: readonly Cuboid[] = [
  ...SIDES.map((side): Cuboid => [STAND.x, YARD_Y, STANDBY_Z + side * 1.9, 0.3, STAND.height, 0.3]),
  [STAND.x, STAND.height, STANDBY_Z, STAND.beam, STAND.beam, 4.4],
  ...STANDBY.map(([, , z]): Cuboid => [BREAKER.x, YARD_Y, z, 0.3, BREAKER.height, 0.3]),
  ...STANDBY.map(([, , z]): Cuboid => [BREAKER.x + 0.35, 1.0, z, 0.45, 0.55, 0.5]),
  [MV_ENTRY[0] - 0.16, MV_ENTRY[1] - 0.4, MV_ENTRY[2], 0.52, 0.8, 1.0],
];
const TANK_PARTS: readonly Cuboid[] = [
  [0, TANK.bottom, 0, TANK.length, TANK.top - TANK.bottom, TANK.depth],
  [0, TANK.top, 0, TANK.length + 0.1, TANK.lid, TANK.depth + 0.1],
  [HALF_L + 0.2, 0.3, 0, 0.4, 1.0, 1.0],
  ...SIDES.flatMap((side): Cuboid[] => [
    [0, 2.4, side * (HALF_D + 0.08), 3.9, 0.12, 0.16],
    ...Array.from({ length: FIN.count }, (_, fin): Cuboid => {
      const x = (fin - (FIN.count - 1) / 2) * FIN.pitch;
      return [x, FIN.bottom, side * (HALF_D + 0.33), 0.04, FIN.height, FIN.depth];
    }),
  ]),
];
const UNIT_STEEL: readonly Cuboid[] = SIDES.flatMap((side): Cuboid[] => [
  [0, 0, side * 0.9, TANK.length + 0.2, TANK.bottom, 0.3],
  [CONSERVATOR.x, LID_TOP, side * 0.6, 0.12, CONSERVATOR.y - LID_TOP, 0.12],
]);
const GANTRY_FOOTINGS = BAY_Z.map((z): Cuboid => [toX, -0.3, z, 1, 0.5, 1]);
const TOWER_FOOTINGS = TOWER_X.flatMap((x) =>
  LEG_Z.map((z): Cuboid => [x, GRASS_Y - 0.3, z, 1.9, 0.55, 1.9]),
);

function atUnits(parts: readonly Cuboid[]): Matrix4[] {
  return TRANSFORMERS.flatMap(({ base: [x, , z] }) =>
    parts.map(([px, py, pz, ...size]) => cuboid([x + px, py, z + pz, ...size])),
  );
}

function tankRounds(): Matrix4[] {
  const { x, y, length, diameter } = CONSERVATOR;
  return TRANSFORMERS.flatMap(({ base: [unitX, , z] }) => [
    strut([unitX + x, y, z - length / 2], [unitX + x, y, z + length / 2], diameter),
    ...PHASES.map((phase) => upright(unitX, TURRET_Y, z + phase * HV.gap, HV.turret, HV.rise)),
  ]);
}

function bushings(): Matrix4[] {
  const height = TRANSFORMER.height - BUSHING_Y;
  return TRANSFORMERS.flatMap(({ base: [x, , z] }) =>
    PHASES.flatMap((phase) => [
      upright(x, BUSHING_Y, z + phase * HV.gap, HV.diameter, height),
      upright(x + HV.lowX, LID_TOP, z + (phase * HV.gap) / 2, LV_DIAMETER, HV.low),
    ]),
  );
}

function towers(): Matrix4[] {
  const { height, base, top, panels } = TOWER;
  const armY = height - ARM.depth / 2;
  return TOWER_X.flatMap((x) => [
    ...LEG_Z.flatMap((z) => [
      ...lattice([x, GRASS_Y, z], [x, height, z], [base, top], panels),
      ...lattice([x, height, z], [x, height + ARM.peak, z], [top, ARM.peakTop], 2),
    ]),
    ...lattice([x, armY, ARM_Z[0]], [x, armY, ARM_Z[1]], [ARM.depth, ARM.depth], ARM.panels),
  ]);
}

function gantry(): Matrix4[] {
  const [north, south] = REACH_Z;
  const columnPanels = Math.round(GANTRY_TOP_Y / FRAME.panel);
  const column = (z: number) =>
    lattice([toX, YARD_Y, z], [toX, GANTRY_TOP_Y, z], FRAME.column, columnPanels);
  const beamPanels = Math.round((south - north) / FRAME.beamPanel);
  const beam = lattice([toX, BEAM_Y, north], [toX, BEAM_Y, south], FRAME.beam, beamPanels);
  return [...BAY_Z.flatMap(column), ...beam, ...GALVANISED.map(cuboid)];
}

function strings(): Matrix4[] {
  const hang = (x: number, top: number) =>
    PHASE_Z.map((z) => upright(x, LINE_Y, z, WIRE.string, top - LINE_Y));
  return [
    ...TOWER_X.flatMap((x) => hang(x, TOWER.height - ARM.depth)),
    ...hang(toX, BEAM_BOTTOM_Y),
  ];
}

function bayInsulators(): Matrix4[] {
  return STANDBY.flatMap(([, , z]) => [
    upright(STAND.x, STAND.height + STAND.beam, z, STAND.postDiameter, STAND.post),
    upright(BREAKER.x, BREAKER.height, z, BREAKER.diameter, BREAKER.column),
  ]);
}

function wires(): Matrix4[] {
  return STOPS.slice(1).flatMap((to, index) => {
    const span = to - STOPS[index];
    const sag = 4 * WIRE.sagPerSquareMetre * span ** 2;
    const segments = Math.ceil(span / WIRE.segmentM);
    const shares = Array.from({ length: segments + 1 }, (_, step) => step / segments);
    const x = (share: number) => lerp(STOPS[index], to, share);
    const along = (z: number) => shares.map((t): Point => [x(t), LINE_Y - sag * t * (1 - t), z]);
    return PHASE_Z.flatMap((z) => polyline(along(z), WIRE.diameter));
  });
}

function buses(): Matrix4[] {
  return PHASE_Z.flatMap((clampZ, phase) => {
    const [x, y, z] = STANDBY[phase];
    const clamp: Point = [toX, LINE_Y, clampZ];
    const route: Point[] = [clamp, [STAND.x, POST_TOP, z], [BREAKER.x, HEAD_TOP, z], [x, y, z]];
    return [
      ...polyline([clamp, FEEDS[phase]], BUS_DIAMETER),
      ...polyline(route, BUS_DIAMETER),
      upright(BREAKER.x, HEAD_TOP - BREAKER.head / 2, z, BREAKER.diameter, BREAKER.head),
    ];
  });
}

function tray(): Matrix4[] {
  return ROUTE.slice(1).flatMap((to, index) => {
    const from = ROUTE[index];
    const alongX = from[2] === to[2];
    const length = Math.abs(to[0] - from[0]) + Math.abs(to[2] - from[2]);
    const box = (share: number, along: number, bottom: number, height: number) => {
      const [x, z] = [lerp(from[0], to[0], share), lerp(from[2], to[2], share)];
      const size: Point = alongX ? [along, height, TRAY.width] : [TRAY.width, height, along];
      return placement([x, bottom + height / 2, z], size);
    };
    const count = Math.max(1, Math.floor(length / TRAY.pitch));
    const posts = Array.from({ length: count }, (_, post) => (post + 0.5) / count);
    return [
      box(0.5, length + TRAY.width, TRAY_BOTTOM, TRAY.plate),
      ...posts.map((share) => box(share, TRAY.post, POST_BASE_Y, TRAY_BOTTOM - POST_BASE_Y)),
    ];
  });
}

function cables(): Matrix4[] {
  const shifted = (offset: number) => ROUTE.map(([x, y, z]): Point => [x + offset, y, z - offset]);
  return CABLE.offsets.flatMap((offset) => polyline(shifted(offset), CABLE.diameter));
}

function fenceLines(): number[][] {
  const [[west, east], [north, south]] = [SUBSTATION.x, SUBSTATION.z];
  const [gateWest, gateEast] = SUBSTATION_GATE;
  const [gapNorth, gapSouth] = [MV_ENTRY[2] - CABLE_GAP_M, MV_ENTRY[2] + CABLE_GAP_M];
  return [
    [gateEast, north, east, north, east, gapNorth],
    [east, gapSouth, east, south, west, south, west, north, gateWest, north],
  ];
}

function buildGridLine(context: PartContext, root: Object3D): CampusPiece {
  const label: Point = [(fromX + toX) / 2, LINE_Y, LINE_Z];
  const add = adder(context, 'gridLine', partGroup(context, 'gridLine', root, label));
  add('steel', 'box', towers());
  add('concrete', 'box', TOWER_FOOTINGS.map(cuboid));
  add('insulator', 'insulator', strings());
  const lit = materialOf(context, 'gridLine', 'conductor');
  const dark = materialOf(context, 'gridLine', DARK_WIRE);
  const conductors = add(lit, 'round', wires());
  return {
    animate({ outage }) {
      conductors.material = outage.gridOn ? lit : dark;
      return false;
    },
  };
}

export const buildPowerYard: PieceBuilder = (context, root) => {
  const unitGroup = partGroup(context, 'transformers', root, boxTop(TRANSFORMERS[1]));
  const units = adder(context, 'transformers', unitGroup);
  units('transformer', 'box', atUnits(TANK_PARTS));
  units('steelDark', 'box', atUnits(UNIT_STEEL));
  units('concrete', 'box', atUnits([[0, -0.3, 0, 5.6, 0.3, 4.6]]));
  units('transformer', 'round', tankRounds());
  units('insulator', 'insulator', bushings());
  const group = partGroup(context, PART, root, [toX, GANTRY_TOP_Y, LINE_Z]);
  const add = adder(context, PART, group);
  group.add(fence(context, PART, fenceLines()));
  add(mottled(context, PART, 'gravel'), 'box', [slab(SUBSTATION, YARD_Y)]);
  add('steel', 'box', gantry());
  add('concrete', 'box', GANTRY_FOOTINGS.map(cuboid));
  add('insulator', 'insulator', bayInsulators());
  add('conductor', 'round', buses());
  add('traySteel', 'box', tray());
  add('cable', 'round', cables());
  return buildGridLine(context, root);
};
