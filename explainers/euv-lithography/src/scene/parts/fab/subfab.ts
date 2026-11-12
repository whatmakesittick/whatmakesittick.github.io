import { BoxGeometry, TorusGeometry, Vector3 } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { Mesh, Object3D } from 'three';
import type { Point } from '../../../ids';
import type { PartContext } from '../context';
import { instanced, placement } from '../kit';
import type { Batch } from './batch';
import {
  BEAM_DEPTH,
  COLUMN_SIZE,
  COLUMN_X,
  COLUMN_Z,
  FLOOR,
  RUN_MAX_X,
  RUN_MIN_X,
  SLAB_BOTTOM,
  SUBFLOOR_THICKNESS,
  SUBFLOOR_TOP,
  UTILITY_Z,
  WALL_THICKNESS,
} from './dims';
import { bar, rod, roundedBlock, runPipe, span, washer } from './shapes';

const PLATE = 0.46;
const PLATE_THICKNESS = 0.04;
const BRACKET_PITCH = 1.2;
const COPPER_RADIUS = 0.065;
const GAS_RADIUS = 0.045;
const VALVE_PITCH = 3.4;
const TRAY_WIDTH = 0.34;
const TRAY_LIP = 0.05;
const CABLE_RADIUS = 0.022;
const CLAMP_PITCH = 1.8;

const COPPER_RUNS: readonly (readonly Point[])[] = [
  [
    [RUN_MIN_X, -0.75, UTILITY_Z],
    [-1.5, -0.75, UTILITY_Z],
    [-1.5, -1.2, UTILITY_Z],
    [RUN_MAX_X, -1.2, UTILITY_Z],
  ],
  [
    [RUN_MIN_X, -0.95, UTILITY_Z + 0.2],
    [-1.2, -0.95, UTILITY_Z + 0.2],
    [-1.2, -1.4, UTILITY_Z + 0.2],
    [RUN_MAX_X, -1.4, UTILITY_Z + 0.2],
  ],
];
const GAS_RUNS: readonly (readonly Point[])[] = [
  [
    [RUN_MIN_X, -1.75, UTILITY_Z],
    [2.5, -1.75, UTILITY_Z],
    [2.5, -2.05, UTILITY_Z],
    [RUN_MAX_X, -2.05, UTILITY_Z],
  ],
  [
    [RUN_MIN_X, -1.95, UTILITY_Z + 0.2],
    [RUN_MAX_X, -1.95, UTILITY_Z + 0.2],
  ],
];
const TRAY_Y = -2.75;

function shell(batch: Batch): void {
  const { minX, maxX, minZ, maxZ } = FLOOR;
  const floorTop = SUBFLOOR_TOP;
  const floorBottom = SUBFLOOR_TOP - SUBFLOOR_THICKNESS;
  const group = STRUCTURE_GROUP;
  batch.add(group, 'granite', span([minX, floorBottom, minZ], [maxX, floorTop, maxZ]));
  batch.add(
    group,
    'granite',
    span([minX, floorTop, minZ], [maxX, SLAB_BOTTOM, minZ + WALL_THICKNESS]),
  );
  const rim = 0.04;
  batch.add(group, 'frame', span([minX, floorBottom, maxZ - rim], [maxX, floorTop, maxZ]));
  [minX, maxX - rim].forEach((x) => {
    batch.add(group, 'frame', span([x, floorBottom, minZ], [x + rim, floorTop, maxZ]));
  });
}

function columns(context: PartContext, batch: Batch): Mesh[] {
  const height = SLAB_BOTTOM - SUBFLOOR_TOP;
  const spots = COLUMN_Z.flatMap((z) => COLUMN_X.map((x): [number, number] => [x, z]));
  const posts = spots.map(([x, z]) => placement([x, SUBFLOOR_TOP + height / 2, z]));
  const plates = spots.flatMap(([x, z]) => [
    placement([x, SUBFLOOR_TOP + PLATE_THICKNESS / 2, z]),
    placement([x, SLAB_BOTTOM - PLATE_THICKNESS / 2, z]),
  ]);
  const post = new BoxGeometry(COLUMN_SIZE, height, COLUMN_SIZE);
  const plate = new BoxGeometry(PLATE, PLATE_THICKNESS, PLATE);
  const { minX, maxX } = FLOOR;
  COLUMN_Z.forEach((z) => {
    const min: Point = [minX, SLAB_BOTTOM - BEAM_DEPTH, z - COLUMN_SIZE / 2];
    const max: Point = [maxX, SLAB_BOTTOM, z + COLUMN_SIZE / 2];
    batch.add(STRUCTURE_GROUP, 'darkFrame', span(min, max));
  });
  return [
    instanced(context, post, STRUCTURE_GROUP, 'subfloor', posts),
    instanced(context, plate, STRUCTURE_GROUP, 'frame', plates),
  ];
}

function copperRuns(batch: Batch): void {
  COPPER_RUNS.forEach((points) =>
    batch.add(STRUCTURE_GROUP, 'copper', runPipe(points, COPPER_RADIUS)),
  );
  GAS_RUNS.forEach((points) => batch.add(STRUCTURE_GROUP, 'flange', runPipe(points, GAS_RADIUS)));
  GAS_RUNS.forEach((points) => {
    const from = points[0];
    const to = points[points.length - 1];
    for (let x = from[0] + VALVE_PITCH / 2; x < to[0] - 1; x += VALVE_PITCH) {
      const y = x < points[1][0] ? from[1] : to[1];
      valve(batch, x, y, from[2]);
    }
  });
}

function valve(batch: Batch, x: number, y: number, z: number): void {
  batch.add(
    STRUCTURE_GROUP,
    'darkFrame',
    rod([x - 0.1, y, z], [x + 0.1, y, z], GAS_RADIUS * 1.9, 12),
  );
  batch.add(STRUCTURE_GROUP, 'darkFrame', rod([x, y, z], [x, y + 0.16, z], GAS_RADIUS * 0.7, 8));
  const wheel = new TorusGeometry(0.06, 0.012, 6, 14)
    .rotateX(Math.PI / 2)
    .translate(x, y + 0.17, z);
  batch.add(STRUCTURE_GROUP, 'accent', wheel);
}

function pipeEnds(batch: Batch): void {
  const ends = [RUN_MIN_X, RUN_MAX_X];
  [...COPPER_RUNS, ...GAS_RUNS].forEach((run, index) => {
    const radius = index < COPPER_RUNS.length ? COPPER_RADIUS : GAS_RADIUS;
    ends.forEach((x, side) => {
      const point = side === 0 ? run[0] : run[run.length - 1];
      const normal = new Vector3(side === 0 ? -1 : 1, 0, 0);
      batch.add(
        STRUCTURE_GROUP,
        'flange',
        washer([x, point[1], point[2]], normal, radius * 0.5, radius * 1.7, 0.03),
      );
      batch.boltRing(STRUCTURE_GROUP, [x, point[1], point[2]], normal, radius * 1.3, 6, 0.012);
    });
  });
}

interface Skid {
  x: number;
  width: number;
  height: number;
  depth: number;
  stripe: boolean;
}

const SKIDS: readonly Skid[] = [
  { x: 2.2, width: 2.0, height: 1.2, depth: 0.9, stripe: true },
  { x: -2.4, width: 1.8, height: 1.1, depth: 0.9, stripe: true },
  { x: 5.3, width: 1.0, height: 1.9, depth: 0.7, stripe: false },
  { x: 6.5, width: 0.8, height: 2.1, depth: 0.6, stripe: false },
];
const SKID_Z = FLOOR.minZ + WALL_THICKNESS + 0.1;

function skids(batch: Batch): void {
  SKIDS.forEach(({ x, width, height, depth, stripe }) => {
    const bottom = SUBFLOOR_TOP + 0.08;
    const front = SKID_Z + depth;
    const group = STRUCTURE_GROUP;
    batch.add(
      group,
      'darkFrame',
      span([x - width / 2, SUBFLOOR_TOP, SKID_Z], [x + width / 2, bottom, front]),
    );
    batch.add(
      group,
      'granite',
      roundedBlock([x, bottom + height / 2, SKID_Z + depth / 2], [width, height, depth], 0.03),
    );
    batch.add(
      group,
      'frame',
      span(
        [x - width / 2 + 0.06, bottom + 0.08, front],
        [x + width / 2 - 0.06, bottom + height - 0.08, front + 0.012],
      ),
    );
    batch.add(
      group,
      stripe ? 'accent' : 'safety',
      span(
        [x - width / 2 + 0.06, bottom + height - 0.22, front + 0.012],
        [x + width / 2 - 0.06, bottom + height - 0.16, front + 0.02],
      ),
    );
    const vents = Math.max(2, Math.round(width * 3));
    for (let index = 0; index < vents; index += 1) {
      const vx = x - width / 2 + 0.2 + ((width - 0.4) * index) / (vents - 1);
      batch.add(
        group,
        'darkFrame',
        span([vx - 0.015, bottom + 0.2, front + 0.012], [vx + 0.015, bottom + 0.6, front + 0.022]),
      );
    }
    batch.add(
      group,
      'flange',
      bar(
        [x + width / 2 - 0.15, bottom + height * 0.45, front + 0.03],
        [x + width / 2 - 0.15, bottom + height * 0.6, front + 0.03],
        0.025,
      ),
    );
  });
  batch.add(
    STRUCTURE_GROUP,
    'copper',
    runPipe(
      [
        [SKIDS[0].x - 0.5, SUBFLOOR_TOP + 1.28, SKID_Z + 0.3],
        [SKIDS[0].x - 0.5, SUBFLOOR_TOP + 1.4, UTILITY_Z + 0.2 + 0.0],
        [SKIDS[0].x - 0.5, -1.4, UTILITY_Z + 0.2],
      ],
      COPPER_RADIUS * 0.7,
      0.15,
    ),
  );
}

function clamps(batch: Batch): void {
  const runs = [...COPPER_RUNS, ...GAS_RUNS];
  for (let x = RUN_MIN_X + 0.5; x < RUN_MAX_X - 0.3; x += CLAMP_PITCH) {
    runs.forEach((run) => {
      const y = x < run[1][0] ? run[0][1] : run[run.length - 1][1];
      batch.add(
        STRUCTURE_GROUP,
        'darkFrame',
        span([x - 0.025, y - 0.1, run[0][2] - 0.1], [x + 0.025, y + 0.1, run[0][2] - 0.04]),
      );
    });
  }
}

function cableTray(context: PartContext, batch: Batch): Mesh {
  const z = UTILITY_Z + 0.05;
  const halfWidth = TRAY_WIDTH / 2;
  const group = STRUCTURE_GROUP;
  batch.add(
    group,
    'tray',
    span([RUN_MIN_X, TRAY_Y - 0.03, z - halfWidth], [RUN_MAX_X, TRAY_Y, z + halfWidth]),
  );
  [-1, 1].forEach((side) => {
    const edge = z + side * halfWidth;
    batch.add(
      group,
      'tray',
      span([RUN_MIN_X, TRAY_Y, edge - 0.015], [RUN_MAX_X, TRAY_Y + TRAY_LIP, edge + 0.015]),
    );
  });
  [-0.08, 0, 0.08].forEach((offset, index) => {
    const from: Point = [RUN_MIN_X, TRAY_Y + CABLE_RADIUS, z + offset];
    const lifted: Point = [-2.5 + index, TRAY_Y + CABLE_RADIUS * 2, z + offset];
    const to: Point = [RUN_MAX_X, TRAY_Y + CABLE_RADIUS, z + offset];
    batch.add(group, 'cable', runPipe([from, lifted, to], CABLE_RADIUS, 0.2));
  });
  const brackets = [];
  for (let x = RUN_MIN_X + 0.3; x < RUN_MAX_X; x += BRACKET_PITCH) {
    brackets.push(placement([x, TRAY_Y - 0.08, FLOOR.minZ + WALL_THICKNESS + 0.15]));
  }
  const bracket = new BoxGeometry(0.04, 0.12, 0.3);
  return instanced(context, bracket, group, 'darkFrame', brackets);
}

function wallSeams(batch: Batch): void {
  const inner = FLOOR.minZ + WALL_THICKNESS + 0.01;
  for (let x = FLOOR.minX + 1; x < FLOOR.maxX; x += 2) {
    batch.add(
      STRUCTURE_GROUP,
      'darkFrame',
      bar([x, SUBFLOOR_TOP, inner], [x, SLAB_BOTTOM, inner], 0.04, 0.02),
    );
  }
}

export function buildSubfab(context: PartContext, batch: Batch, parent: Object3D): void {
  shell(batch);
  wallSeams(batch);
  copperRuns(batch);
  pipeEnds(batch);
  skids(batch);
  clamps(batch);
  parent.add(...columns(context, batch), cableTray(context, batch));
}
