import { BoxGeometry, CylinderGeometry, Group } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { lerp } from '@core/math';
import type { PartId } from '../../../ids';
import {
  ELECTRONICS,
  ENGINE,
  ENGINE_TUB,
  FUEL_TANKS,
  JET,
  PAYLOAD_BAY,
  PANEL,
  STARLINK_PANEL_XS,
  BACKUP_PANEL_X,
  DOME,
  BOW_CAMERA,
} from '../../../model/layout';
import { roundedRectShape, extrudeProfileAlongX } from '@core/scene/geometry/extrude';
import { INTERNALS, SHELL } from '../../constants';
import { FINISHES } from '../../finishes';
import { spread } from '../../geometry/curves';
import { fittedSolid, tubeAlong } from '../../geometry/fitted';
import type { FittedBox } from '../../geometry/fitted';
import { flatPolygon, offsetPolyline, pinToAxis } from '../../geometry/flat';
import { bottomYAt, hullSectionAt } from '../../geometry/hullLines';
import type { Pair } from '../../geometry/hullLines';
import { gridSurface, orientFrom } from '../../geometry/surface';
import type { Vec3 } from '../../geometry/surface';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';
import { innerProfile } from './hullShell';

export interface Internals {
  object: Group;
  labels: ReadonlyMap<PartId, Object3D>;
}

type InternalPart = 'payloadBay' | 'fuelTanks' | 'engine' | 'electronicsBay';

const QUARTER_TURN = Math.PI / 2;
const SEGMENTS = 12;
const middle = ([a, b]: readonly [number, number]) => (a + b) / 2;

function boxBetween(
  x: readonly [number, number],
  y: readonly [number, number],
  z: readonly [number, number],
) {
  const box = new BoxGeometry(x[1] - x[0], y[1] - y[0], z[1] - z[0]);
  box.translate(middle(x), middle(y), middle(z));
  return box;
}

function cylinderAlong(
  axis: 'x' | 'y' | 'z',
  radius: number,
  length: number,
  at: Vec3,
  segments = SEGMENTS,
) {
  const piece = new CylinderGeometry(radius, radius, length, segments);
  if (axis === 'x') piece.rotateZ(QUARTER_TURN);
  if (axis === 'z') piece.rotateX(QUARTER_TURN);
  piece.translate(...at);
  return piece;
}

function roundedBlock(part: {
  x: readonly [number, number];
  halfWidth: number;
  y: readonly [number, number];
}) {
  const shape = roundedRectShape(
    { minA: -part.halfWidth, maxA: part.halfWidth, minB: part.y[0], maxB: part.y[1] },
    INTERNALS.engine.rounding,
  );
  return extrudeProfileAlongX(shape, part.x[0], part.x[1]);
}

function payloadBay(): BufferGeometry {
  const { box } = PAYLOAD_BAY;
  const fitted: FittedBox = {
    x: box.x,
    z: (x) => {
      const share = (x - box.x[0]) / (box.x[1] - box.x[0]);
      const half = lerp(box.halfWidth, INTERNALS.bay.foreHalfWidth, share);
      return [-half, half];
    },
    y: box.y,
    clearance: INTERNALS.clearance,
  };
  return fittedSolid(fitted, INTERNALS.bay.samples, false);
}

function bulkheads(): BufferGeometry {
  return mergeParts(
    PAYLOAD_BAY.bulkheads.map((x) => {
      const inner = innerProfile(hullSectionAt(x));
      const outline: Pair[] = [...inner, [0, inner[inner.length - 1][1]]];
      return flatPolygon(outline, (z, y) => [x, y, z]);
    }),
  );
}

function tanks(): { shells: BufferGeometry; petrol: BufferGeometry; necks: BufferGeometry } {
  const half = FUEL_TANKS.width / 2;
  const level = lerp(FUEL_TANKS.y[0], FUEL_TANKS.y[1], INTERNALS.tank.fill);
  const box = (side: number, top: number): FittedBox => ({
    x: FUEL_TANKS.x,
    z: () => {
      const centre = side * FUEL_TANKS.centreZ;
      return [centre - half, centre + half];
    },
    y: [FUEL_TANKS.y[0], top],
    clearance: INTERNALS.clearance,
  });
  const inset = (fitted: FittedBox): FittedBox => ({
    ...fitted,
    x: [fitted.x[0] + SHELL.thickness, fitted.x[1] - SHELL.thickness],
    z: (x) => {
      const [a, b] = fitted.z(x);
      return [a + SHELL.thickness, b - SHELL.thickness];
    },
    clearance: fitted.clearance + SHELL.thickness,
  });
  const sides = [-1, 1];
  const { neck } = INTERNALS.tank;
  const deck = hullSectionAt(neck.x).deck - SHELL.thickness;
  const necks = sides.flatMap((side) => {
    const height = deck - FUEL_TANKS.y[1];
    return [
      cylinderAlong('y', neck.radius, height, [
        neck.x,
        FUEL_TANKS.y[1] + height / 2,
        side * neck.z,
      ]),
      cylinderAlong('y', neck.cap, neck.radius, [neck.x, deck - neck.radius / 2, side * neck.z]),
    ];
  });
  return {
    shells: mergeParts(
      sides.map((side) => fittedSolid(box(side, FUEL_TANKS.y[1]), INTERNALS.tank.samples)),
    ),
    petrol: mergeParts(
      sides.map((side) => fittedSolid(inset(box(side, level)), INTERNALS.tank.samples)),
    ),
    necks: mergeParts(necks),
  };
}

function tubSection(): { outer: Pair[]; inner: Pair[] } {
  const x = middle(ENGINE_TUB.x);
  const floor = (z: number) => bottomYAt(x, z) + INTERNALS.tub.floorLift;
  const zs = spread(0, ENGINE_TUB.halfWidth, 4);
  const outer: Pair[] = [
    ...zs.map((z): Pair => [z, floor(z)]),
    [ENGINE_TUB.halfWidth, ENGINE_TUB.y[1]],
  ];
  const inner = offsetPolyline(outer, INTERNALS.tub.wall);
  inner[0] = pinToAxis(inner[0], [outer[1][0] - outer[0][0], outer[1][1] - outer[0][1]]);
  return { outer, inner };
}

function extrudeAlongX(points: readonly Pair[], x: readonly [number, number]): BufferGeometry {
  return gridSurface(points.map(([z, y]) => [[x[0], y, z] as Vec3, [x[1], y, z] as Vec3]));
}

function tub(): { metal: BufferGeometry; cut: BufferGeometry } {
  const { outer, inner } = tubSection();
  const ends = ENGINE_TUB.x.map((x) =>
    flatPolygon([...outer, [0, ENGINE_TUB.y[1]]], (z, y) => [x, y, z]),
  );
  const rim = gridSurface([
    [
      [ENGINE_TUB.x[0], ENGINE_TUB.y[1], outer[outer.length - 1][0]],
      [ENGINE_TUB.x[1], ENGINE_TUB.y[1], outer[outer.length - 1][0]],
    ],
    [
      [ENGINE_TUB.x[0], ENGINE_TUB.y[1], inner[inner.length - 1][0]],
      [ENGINE_TUB.x[1], ENGINE_TUB.y[1], inner[inner.length - 1][0]],
    ],
  ]);
  const cut = flatPolygon(
    [
      [ENGINE_TUB.x[0], outer[0][1]],
      [ENGINE_TUB.x[1], outer[0][1]],
      [ENGINE_TUB.x[1], inner[0][1]],
      [ENGINE_TUB.x[0], inner[0][1]],
    ],
    (a, b) => [a, b, 0],
  );
  return {
    metal: mergeParts([
      extrudeAlongX(outer, ENGINE_TUB.x),
      extrudeAlongX(inner, ENGINE_TUB.x),
      rim,
      ...ends,
    ]),
    cut: orientFrom(cut, SHELL.port),
  };
}

function foam(): BufferGeometry {
  const from = Math.max(ENGINE_TUB.x[0], JET.intake.x[1] + INTERNALS.clearance);
  const x: readonly [number, number] = [from, ENGINE_TUB.x[1]];
  const section = hullSectionAt(middle(ENGINE_TUB.x));
  const [keel, intake, chine, knuckle] = innerProfile(section);
  const top = INTERNALS.tub.foamTop;
  const share = (top - chine[1]) / (knuckle[1] - chine[1]);
  const side: Pair = [lerp(chine[0], knuckle[0], share), top];
  const { outer } = tubSection();
  const wallZ = ENGINE_TUB.halfWidth;
  const outline: Pair[] = [
    keel,
    intake,
    chine,
    side,
    [wallZ, top],
    ...[...outer.slice(0, -1)].reverse(),
  ];
  const caps = x.map((at) => flatPolygon(outline, (z, y) => [at, y, z]));
  const surface = gridSurface([
    [
      [x[0], top, wallZ],
      [x[1], top, wallZ],
    ],
    [
      [x[0], top, side[0]],
      [x[1], top, side[0]],
    ],
  ]);
  const cut = flatPolygon(
    [
      [x[0], keel[1]],
      [x[1], keel[1]],
      [x[1], outer[0][1]],
      [x[0], outer[0][1]],
    ],
    (a, b) => [a, b, 0],
  );
  return mergeParts([...caps, surface, cut]);
}

function engineBody(): {
  block: BufferGeometry;
  dark: BufferGeometry;
  manifold: BufferGeometry;
  exhaust: BufferGeometry;
  rubber: BufferGeometry;
} {
  const spec = INTERNALS.engine;
  const ribs = spread(spec.cover.x[0] + 0.04, spec.cover.x[1] - 0.04, spec.ribs - 1).map((x) =>
    boxBetween(
      [x - 0.006, x + 0.006],
      [spec.cover.y[1], spec.cover.y[1] + 0.008],
      [-spec.cover.halfWidth * 0.8, spec.cover.halfWidth * 0.8],
    ),
  );
  const coils = spec.coilXs.map((x) =>
    boxBetween(
      [x - spec.coil[0] / 2, x + spec.coil[0] / 2],
      [spec.cover.y[1], spec.cover.y[1] + spec.coil[2]],
      [-spec.coil[1] / 2, spec.coil[1] / 2],
    ),
  );
  const { plenum, runner, throttle } = spec;
  const runners = cylinderXs().map((x) =>
    tubeAlong(
      [
        [x, runner.from[1], runner.from[0]],
        [x, plenum.y + 0.03, (runner.from[0] + plenum.z) / 2],
        [x, plenum.y, plenum.z],
      ],
      runner.radius,
    ),
  );
  const manifold = mergeParts([
    cylinderAlong('x', plenum.radius, plenum.x[1] - plenum.x[0], [
      middle(plenum.x),
      plenum.y,
      plenum.z,
    ]),
    cylinderAlong('x', throttle.radius, throttle.length, [
      plenum.x[0] - throttle.length / 2,
      plenum.y,
      plenum.z,
    ]),
    ...runners,
  ]);
  const { exhaust, muffler } = spec;
  const headers = cylinderXs().map((x) =>
    tubeAlong(
      [
        [x, 0.08, 0.16],
        [x, 0.04, 0.215],
        [lerp(x, exhaust.collector[0], 0.6), 0.0, exhaust.collector[1]],
      ],
      exhaust.radius,
    ),
  );
  const pipe = tubeAlong(
    [
      [exhaust.collector[0], 0.0, exhaust.collector[1]],
      [-1.4, 0.0, 0.25],
      [muffler.centre[0] + muffler.length / 2, muffler.centre[1], muffler.centre[2]],
    ],
    exhaust.radius * 1.2,
  );
  const tail = tubeAlong(
    [
      [muffler.centre[0] - muffler.length / 2, muffler.centre[1], muffler.centre[2]],
      [-2.3, 0.02, 0.35],
      exhaust.outlet,
    ],
    exhaust.radius * 1.2,
  );
  const { starter, filter, alternator, flange, mounts } = spec;
  const block = mergeParts([
    roundedBlock(spec.sump),
    roundedBlock(spec.block),
    roundedBlock(spec.head),
    cylinderAlong('x', starter.radius, starter.x[1] - starter.x[0], [
      middle(starter.x),
      starter.y,
      starter.z,
    ]),
    cylinderAlong('z', alternator.radius, alternator.length, [
      alternator.x,
      alternator.y,
      alternator.z,
    ]),
    cylinderAlong('x', flange.radius, flange.length, [
      ENGINE.x[0] - flange.length / 2,
      JET.axisY,
      0,
    ]),
  ]);
  const dark = mergeParts([
    roundedBlock(spec.cover),
    ...ribs,
    ...coils,
    cylinderAlong('z', filter.radius, filter.length, [
      filter.x,
      filter.y,
      filter.z + filter.length / 2,
    ]),
  ]);
  const rubber = mergeParts(
    mounts.xs.flatMap((x) =>
      [-1, 1].map((side) => {
        const z = side * mounts.z;
        const floor = bottomYAt(x, z) + INTERNALS.tub.floorLift;
        return boxBetween(
          [x - mounts.size[0] / 2, x + mounts.size[0] / 2],
          [floor, floor + mounts.size[1] + 0.02],
          [z - mounts.size[2] / 2, z + mounts.size[2] / 2],
        );
      }),
    ),
  );
  return {
    block,
    dark,
    manifold,
    exhaust: mergeParts([
      ...headers,
      pipe,
      tail,
      cylinderAlong('x', muffler.radius, muffler.length, muffler.centre),
    ]),
    rubber,
  };
}

function cylinderXs(): number[] {
  return [...INTERNALS.engine.coilXs];
}

function electronics(): { tray: BufferGeometry; dark: BufferGeometry; light: BufferGeometry } {
  const { tray, electronics: items } = INTERNALS;
  const [x0, x1] = ELECTRONICS.x;
  const half = ELECTRONICS.halfWidth;
  const base = ELECTRONICS.y[0];
  const top = base + tray.thickness;
  const plate = boxBetween([x0, x1], [base, top], [-half, half]);
  const lips = [-1, 1].map((side) =>
    boxBetween(
      [x0, x1],
      [top, top + tray.lip],
      [side * half - tray.thickness / 2, side * half + tray.thickness / 2],
    ),
  );
  const legs = [x0 + 0.05, x1 - 0.05].flatMap((x) =>
    [-1, 1].map((side) =>
      boxBetween(
        [x - tray.legs, x + tray.legs],
        [ENGINE_TUB.y[1], base],
        [side * (half - 0.04) - tray.legs, side * (half - 0.04) + tray.legs],
      ),
    ),
  );
  const { computer, router, power, puck, canister } = items;
  const fins = spread(computer.x[0] + 0.02, computer.x[1] - 0.02, computer.fins - 1).map((x) =>
    boxBetween(
      [x - 0.004, x + 0.004],
      [top + computer.height, top + computer.height + 0.012],
      computer.z,
    ),
  );
  const antennas = [-1, 1].map((side) =>
    cylinderAlong('y', 0.005, router.antenna, [
      side > 0 ? router.x[1] - 0.02 : router.x[0] + 0.02,
      top + router.height + router.antenna / 2,
      router.z[0] + 0.02,
    ]),
  );
  return {
    tray: mergeParts([plate, ...lips, ...legs]),
    dark: mergeParts([
      boxBetween(computer.x, [top, top + computer.height], computer.z),
      ...fins,
      boxBetween(power.x, [top, top + power.height], power.z),
      cylinderAlong('y', puck.radius, puck.height, [puck.x, top + puck.height / 2, puck.z], 20),
      cylinderAlong('x', canister.radius, canister.x[1] - canister.x[0], [
        middle(canister.x),
        top + canister.radius,
        canister.z,
      ]),
      ...antennas,
    ]),
    light: boxBetween(router.x, [top, top + router.height], router.z),
  };
}

function cables(): { cables: BufferGeometry; hoses: BufferGeometry } {
  const { radius, hose } = INTERNALS.cable;
  const top = ELECTRONICS.y[0] + INTERNALS.tray.thickness;
  const panelUnder = PANEL.top - PANEL.thickness - 0.03;
  const toPanel = (from: Vec3, x: number, z: number) =>
    tubeAlong(
      [from, [lerp(from[0], x, 0.5), panelUnder - 0.04, (from[2] + z) / 2], [x, panelUnder, z]],
      radius,
    );
  const dome: Vec3 = [DOME.x, DOME.base - 0.03, 0];
  const camera: Vec3 = [BOW_CAMERA.x[0], hullSectionAt(BOW_CAMERA.x[0]).deck - 0.04, 0.02];
  const forward = tubeAlong(
    [
      [-0.95, top + 0.03, 0.2],
      [-0.6, top + 0.02, 0.45],
      [0.3, 0.3, 0.52],
      [0.75, 0.36, 0.45],
      [dome[0] - 0.12, dome[1] - 0.02, 0.18],
      dome,
    ],
    radius * 1.4,
  );
  const bow = tubeAlong([[0.75, 0.36, 0.45], [1.4, 0.4, 0.42], [1.9, 0.42, 0.25], camera], radius);
  const tankHose = (side: number): BufferGeometry =>
    tubeAlong(
      [
        [FUEL_TANKS.x[0] + 0.04, FUEL_TANKS.y[1] - 0.04, side * 0.2],
        [-0.6, ENGINE_TUB.y[1] + 0.03, side * 0.16],
        [-0.8, ENGINE_TUB.y[1] + 0.02, -0.12],
        [
          INTERNALS.engine.plenum.x[1],
          INTERNALS.engine.plenum.y + 0.05,
          INTERNALS.engine.plenum.z + 0.04,
        ],
      ],
      hose,
    );
  const vent = tubeAlong(
    [
      [0.1, FUEL_TANKS.y[1], 0.27],
      [-0.4, 0.3, 0.3],
      [-0.9, top + 0.06, 0.25],
      [
        INTERNALS.electronics.canister.x[1],
        top + INTERNALS.electronics.canister.radius,
        INTERNALS.electronics.canister.z,
      ],
    ],
    radius,
  );
  return {
    cables: mergeParts([
      toPanel([-1.4, top + 0.075, -0.2], BACKUP_PANEL_X, -0.1),
      toPanel([-1.3, top + 0.075, -0.1], STARLINK_PANEL_XS[0], -0.08),
      toPanel([-1.0, top + 0.045, -0.2], STARLINK_PANEL_XS[1], -0.08),
      forward,
      bow,
    ]),
    hoses: mergeParts([tankHose(-1), tankHose(1), vent]),
  };
}

export function buildInternals(context: PartContext): Internals {
  const object = new Group();
  const fuel = tanks();
  const tubParts = tub();
  const engine = engineBody();
  const bay = electronics();
  const wiring = cables();
  object.add(
    partMesh(context, payloadBay(), 'payloadBay', FINISHES.bay),
    partMesh(context, bulkheads(), 'payloadBay', FINISHES.bulkhead),
    partMesh(context, fuel.petrol, 'fuelTanks', FINISHES.petrol),
    partMesh(context, fuel.shells, 'fuelTanks', FINISHES.tank),
    partMesh(context, fuel.necks, 'fuelTanks', FINISHES.hose),
    partMesh(context, tubParts.metal, 'engine', FINISHES.tub),
    partMesh(context, tubParts.cut, 'engine', FINISHES.section),
    partMesh(context, foam(), 'engine', FINISHES.foam),
    partMesh(context, engine.block, 'engine', FINISHES.block),
    partMesh(context, engine.dark, 'engine', FINISHES.head),
    partMesh(context, engine.manifold, 'engine', FINISHES.manifold),
    partMesh(context, engine.exhaust, 'engine', FINISHES.exhaust),
    partMesh(context, engine.rubber, 'engine', FINISHES.rubber),
    partMesh(context, bay.tray, 'electronicsBay', FINISHES.tub),
    partMesh(context, bay.dark, 'electronicsBay', FINISHES.box),
    partMesh(context, bay.light, 'electronicsBay', FINISHES.router),
    partMesh(context, wiring.cables, 'electronicsBay', FINISHES.cable),
    partMesh(context, wiring.hoses, 'fuelTanks', FINISHES.hose),
  );
  const at = (x: number, y: number, z: number) => anchorAt(object, x, y, z);
  const labels = new Map<InternalPart, Object3D>([
    ['payloadBay', at(middle(PAYLOAD_BAY.box.x), PAYLOAD_BAY.box.y[1], 0)],
    ['fuelTanks', at(middle(FUEL_TANKS.x), FUEL_TANKS.y[1], -FUEL_TANKS.centreZ)],
    ['engine', at(middle(ENGINE.x), ENGINE.y[1], 0)],
    ['electronicsBay', at(middle(ELECTRONICS.x), ELECTRONICS.y[1], 0)],
  ]);
  return { object, labels };
}
