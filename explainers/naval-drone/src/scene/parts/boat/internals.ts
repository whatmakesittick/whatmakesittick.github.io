import { Group } from 'three';
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
import { boxBetween, rod } from '../../geometry/solids';
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

const middle = ([a, b]: readonly [number, number]) => (a + b) / 2;

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
      rod('y', neck.radius, height, [neck.x, FUEL_TANKS.y[1] + height / 2, side * neck.z]),
      rod('y', neck.cap, neck.radius, [neck.x, deck - neck.radius / 2, side * neck.z]),
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
  const detail = INTERNALS.detail;
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
        [x, plenum.y + detail.runnerRise, (runner.from[0] + plenum.z) / 2],
        [x, plenum.y, plenum.z],
      ],
      runner.radius,
    ),
  );
  const manifold = mergeParts([
    rod('x', plenum.radius, plenum.x[1] - plenum.x[0], [middle(plenum.x), plenum.y, plenum.z]),
    rod('x', throttle.radius, throttle.length, [
      plenum.x[0] - throttle.length / 2,
      plenum.y,
      plenum.z,
    ]),
    ...runners,
  ]);
  const { exhaust, muffler } = spec;
  const { routes } = INTERNALS;
  const [collectorX, collectorY, collectorZ] = exhaust.collector;
  const headers = cylinderXs().map((x) =>
    tubeAlong(
      [
        ...routes.headers.map(([, y, z]): Vec3 => [x, y, z]),
        [lerp(x, collectorX, detail.headerShare), collectorY, collectorZ],
      ],
      exhaust.radius,
    ),
  );
  const pipeRadius = exhaust.radius * detail.exhaustGrow;
  const [mufflerX, mufflerY, mufflerZ] = muffler.centre;
  const pipe = tubeAlong(
    [
      [collectorX, collectorY, collectorZ],
      routes.pipe,
      [mufflerX + muffler.length / 2, mufflerY, mufflerZ],
    ],
    pipeRadius,
  );
  const tail = tubeAlong(
    [[mufflerX - muffler.length / 2, mufflerY, mufflerZ], routes.tail, exhaust.outlet],
    pipeRadius,
  );
  const { flange, mounts } = spec;
  const block = mergeParts([
    roundedBlock(spec.sump),
    roundedBlock(spec.block),
    roundedBlock(spec.head),
    rod('x', flange.radius, flange.length, [ENGINE.x[0] - flange.length / 2, JET.axisY, 0]),
  ]);
  const dark = mergeParts([roundedBlock(spec.cover), ...coils]);
  const rubber = mergeParts(
    mounts.xs.flatMap((x) =>
      [-1, 1].map((side) => {
        const z = side * mounts.z;
        const floor = bottomYAt(x, z) + INTERNALS.tub.floorLift;
        return boxBetween(
          [x - mounts.size[0] / 2, x + mounts.size[0] / 2],
          [floor, floor + mounts.size[1] + detail.mountRise],
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
      rod('x', muffler.radius, muffler.length, muffler.centre),
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
  const { computer, router, power, puck, canister } = items;
  const box = (part: {
    x: readonly [number, number];
    z: readonly [number, number];
    height: number;
  }) => boxBetween(part.x, [top, top + part.height], part.z);
  return {
    tray: boxBetween([x0, x1], [base, top], [-half, half]),
    dark: mergeParts([
      box(computer),
      box(power),
      rod('y', puck.radius, puck.height, [puck.x, top + puck.height / 2, puck.z]),
      rod('x', canister.radius, canister.x[1] - canister.x[0], [
        middle(canister.x),
        top + canister.radius,
        canister.z,
      ]),
    ]),
    light: box(router),
  };
}

function cables(): BufferGeometry {
  const { radius, sag } = INTERNALS.cable;
  return mergeParts(
    INTERNALS.routes.panels.map(({ from, to }) =>
      tubeAlong([from, [(from[0] + to[0]) / 2, to[1] - sag, (from[2] + to[2]) / 2], to], radius),
    ),
  );
}

export function buildInternals(context: PartContext): Internals {
  const object = new Group();
  const fuel = tanks();
  const tubParts = tub();
  const engine = engineBody();
  const bay = electronics();
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
    partMesh(context, cables(), 'electronicsBay', FINISHES.cable),
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
