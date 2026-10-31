import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';
import type { BufferGeometry, Group } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box as boxGeometry } from '@core/scene/geometry/box';
import type { Point } from '../../../ids';
import { CHIP_ANCHOR, MANIFOLD, SUBJECT_TRAY_Y } from '../../../model';
import type { BoxSpec } from '../../../model';
import { label, namedGroup, placement } from '../context';
import {
  COMPUTE_BANDS,
  RACK_X,
  SPAN,
  SUBJECT_BAND,
  TRAY_HEIGHT,
  TRAY_X,
  TRAY_Z,
  around,
} from './dims';
import { RACK_FINISHES } from './finishes';
import { bezel, handles, led } from './front';
import { box, lifted, perBand } from './kit';
import type { Kit, Look } from './kit';

export interface ComputeTrays {
  readonly group: Group;
  readonly liquid: Group;
  readonly air: Group;
}

const [, , CHIP_Z] = CHIP_ANCHOR;
const PLATE_Z = [CHIP_Z, CHIP_Z + 0.3] as const;
const PAN_M = 0.003;
const WALL_TOP = { east: 0.04, west: 0.01, rear: 0.03 } as const;
const BOARD_TOP = 0.0048;
const PACKAGE_TOP = 0.0078;
const PLATE_TOP = 0.022;
const PLATE: Readonly<{ x: number; z: number }> = { x: 0.22, z: 0.15 };
const PACKAGE: Readonly<{ x: number; z: number }> = { x: 0.2, z: 0.13 };
const GLOW_GROW_M = 0.01;
const INLET_PROUD_M = 0.003;
const SINK_BASE_TOP = 0.012;
const FIN_TOP = 0.046;
const FINS = 8;
const FIN_M = 0.002;
const HOSE_RADIUS = 0.005;
const HOSE_SEGMENTS = 12;
const HOSE_SIDES = 5;
export const QD_Y = 0.02;
export const QD_Z = TRAY_Z[1] - 0.01;
const HOSE_Y = 0.015;
const LOOP_Y = 0.033;
const HALF_PLATE = PLATE.x / 2;
const TRAYS = COMPUTE_BANDS.map(([bottom]) => placement([0, bottom, 0]));

function chassis(): BoxSpec[] {
  const [west, east] = TRAY_X;
  return [
    box(TRAY_X, [0, PAN_M], TRAY_Z),
    box([east - PAN_M, east], [PAN_M, WALL_TOP.east], TRAY_Z),
    box([west, west + PAN_M], [PAN_M, WALL_TOP.west], [TRAY_Z[0], TRAY_Z[1] - PAN_M]),
    box([west, east - PAN_M], [PAN_M, WALL_TOP.rear], [TRAY_Z[1] - PAN_M, TRAY_Z[1]]),
  ];
}

function components() {
  const board = box(
    [TRAY_X[0] + 0.012, TRAY_X[1] - 0.012],
    [PAN_M, BOARD_TOP],
    [TRAY_Z[0] + 0.02, TRAY_Z[1] - 0.02],
  );
  const nics = [-0.11, 0.11].map((dx) =>
    box(around(RACK_X + dx, 0.07), [BOARD_TOP, 0.02], [TRAY_Z[0] + 0.04, TRAY_Z[0] + 0.12]),
  );
  const connectors = [-0.12, 0.12].map((dx) =>
    box(around(RACK_X + dx, 0.14), [BOARD_TOP, 0.018], [TRAY_Z[1] - 0.07, TRAY_Z[1] - 0.02]),
  );
  const packages = PLATE_Z.map((z) =>
    box(around(RACK_X, PACKAGE.x), [BOARD_TOP, PACKAGE_TOP], around(z, PACKAGE.z)),
  );
  const plates = PLATE_Z.map((z) =>
    box(around(RACK_X, PLATE.x), [PACKAGE_TOP, PLATE_TOP], around(z, PLATE.z)),
  );
  const inlet = box(
    around(RACK_X, 0.06),
    [0.006, 0.018],
    [TRAY_Z[1] - 0.03, TRAY_Z[1] + INLET_PROUD_M],
  );
  return { board, nics, connectors, packages, plates, inlet };
}

function fin(x: number, z: number): BufferGeometry {
  return boxGeometry({
    minX: x - FIN_M / 2,
    maxX: x + FIN_M / 2,
    minY: SINK_BASE_TOP,
    maxY: FIN_TOP,
    minZ: z - PLATE.z / 2,
    maxZ: z + PLATE.z / 2,
  });
}

function sink(): BufferGeometry {
  const pitch = PLATE.x / FINS;
  const parts = PLATE_Z.flatMap((z) => [
    boxGeometry({
      minX: RACK_X - HALF_PLATE,
      maxX: RACK_X + HALF_PLATE,
      minY: PACKAGE_TOP,
      maxY: SINK_BASE_TOP,
      minZ: z - PLATE.z / 2,
      maxZ: z + PLATE.z / 2,
    }),
    ...Array.from({ length: FINS }, (_, index) =>
      fin(RACK_X - HALF_PLATE + (index + 0.5) * pitch, z),
    ),
  ]);
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

function hose(points: readonly Point[]): BufferGeometry {
  const curve = new CatmullRomCurve3(points.map((point) => new Vector3(...point)));
  return new TubeGeometry(curve, HOSE_SEGMENTS, HOSE_RADIUS, HOSE_SIDES);
}

const [NEAR_PLATE, FAR_PLATE] = PLATE_Z;
const PLATE_LINK_X = RACK_X + 0.05;

const HOSES: ReadonlyArray<readonly [Look, readonly Point[]]> = [
  [
    'pipeSupply',
    [
      [MANIFOLD.supplyX + 0.004, QD_Y, QD_Z],
      [MANIFOLD.supplyX + 0.012, LOOP_Y, QD_Z - 0.07],
      [RACK_X - 0.17, LOOP_Y, FAR_PLATE + 0.06],
      [RACK_X - 0.135, HOSE_Y + 0.002, FAR_PLATE],
      [RACK_X - HALF_PLATE + 0.005, HOSE_Y, FAR_PLATE],
    ],
  ],
  [
    'pipeReturn',
    [
      [PLATE_LINK_X, HOSE_Y, FAR_PLATE - PLATE.z / 2 + 0.01],
      [PLATE_LINK_X + 0.01, LOOP_Y, FAR_PLATE - PLATE.z / 2 - 0.04],
      [PLATE_LINK_X + 0.01, LOOP_Y, NEAR_PLATE + PLATE.z / 2 + 0.04],
      [PLATE_LINK_X, HOSE_Y, NEAR_PLATE + PLATE.z / 2 - 0.01],
    ],
  ],
  [
    'pipeReturn',
    [
      [RACK_X + HALF_PLATE - 0.005, HOSE_Y, NEAR_PLATE],
      [RACK_X + 0.15, HOSE_Y + 0.004, NEAR_PLATE],
      [RACK_X + 0.19, LOOP_Y, NEAR_PLATE + 0.08],
      [MANIFOLD.returnX - 0.012, LOOP_Y, QD_Z - 0.14],
      [MANIFOLD.returnX - 0.004, QD_Y, QD_Z],
    ],
  ],
];

export function buildComputeTrays(kit: Kit, root: Group): ComputeTrays {
  const group = namedGroup('computeTrays', root);
  const liquid = namedGroup('coldPlates', group);
  const air = namedGroup('heatSinks', group);
  const add = (parent: Group, look: Look, local: readonly BoxSpec[]) =>
    kit.boxes(parent, 'computeTrays', look, perBand(COMPUTE_BANDS, local));
  const parts = components();
  add(group, 'tray', chassis());
  add(group, RACK_FINISHES.bezel, [bezel(TRAY_HEIGHT)]);
  add(group, 'steelLight', handles(TRAY_HEIGHT));
  kit.faces(
    group,
    'computeTrays',
    'statusLight',
    perBand(COMPUTE_BANDS, [led(RACK_X - 0.115, TRAY_HEIGHT * 0.82)]),
  );
  add(group, RACK_FINISHES.board, [parts.board]);
  add(group, 'fan', parts.nics);
  add(group, RACK_FINISHES.port, parts.connectors);
  add(group, RACK_FINISHES.package, parts.packages);
  add(group, 'copper', [parts.inlet]);
  add(liquid, RACK_FINISHES.coldPlate, parts.plates);
  const glow = box(
    around(RACK_X, PACKAGE.x + GLOW_GROW_M),
    [BOARD_TOP, PACKAGE_TOP - 0.0004],
    around(NEAR_PLATE, PACKAGE.z + GLOW_GROW_M),
  );
  kit.boxes(group, 'computeTrays', RACK_FINISHES.chipGlow, [lifted(glow, SUBJECT_BAND[0])]);
  HOSES.forEach(([look, points]) => {
    kit.copies(liquid, 'computeTrays', look, kit.context.tracker.track(hose(points)), TRAYS);
  });
  kit.copies(air, 'computeTrays', RACK_FINISHES.heatSink, kit.context.tracker.track(sink()), TRAYS);
  label(kit.context, 'computeTrays', group, [
    SPAN.x[0],
    SUBJECT_TRAY_Y + TRAY_HEIGHT,
    CHIP_Z + 0.3,
  ]);
  return { group, liquid, air };
}
