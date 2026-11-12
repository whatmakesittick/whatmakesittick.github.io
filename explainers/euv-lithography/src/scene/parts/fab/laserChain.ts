import { Vector3 } from 'three';
import type { Point } from '../../../ids';
import type { Batch } from './batch';
import { ROOM } from './dims';
import { AXIS_X, bar, block, rod, roundedBlock, runPipe, span, washer } from './shapes';

const GROUP = 'driveLaser';
const FLOOR_Y = ROOM.y[0];
const BEAM_Y = FLOOR_Y + 0.35;
const AMP = { minX: -7.3, maxX: -5.7, width: 0.4, height: 0.44, foot: 0.12 } as const;
const AMP_ROWS: readonly number[] = [-1.05, -0.45, 0.45, 1.05];
const CABINET_X: readonly number[] = [-6.9, -6.2, -6.8, -6.2];
const CABINET = { width: 0.55, height: 0.4, depth: 0.34 } as const;
const FOLD_LEFT = -7.5;
const FOLD_RIGHT = -5.55;
const FOLD_SIZE = 0.2;
const BEAM_RADIUS = 0.014;
const SEED = { minX: -7.85, maxX: -7.4, half: 0.18 } as const;
const MANIFOLD_X = -5.2;
const MANIFOLD_Y = FLOOR_Y + 0.15;
const TRAY_X = -7.65;
const TRAY_Y = ROOM.y[1] - 0.35;
const STRIPES: readonly number[] = [-0.5, 0, 0.5];
const STRIPE_WIDTH = 0.07;
const END_BOLTS = 6;
const END_BOLT_SIZE = 0.013;
const RETURN_PATH_Y = -2.2;

function beamPath(): Point[] {
  const [a, b, c, d] = AMP_ROWS;
  const exit: Point = [-6.5, RETURN_PATH_Y, 0];
  return [
    [SEED.maxX, BEAM_Y, a],
    [FOLD_RIGHT, BEAM_Y, a],
    [FOLD_RIGHT, BEAM_Y, b],
    [FOLD_LEFT, BEAM_Y, b],
    [FOLD_LEFT, BEAM_Y, c],
    [FOLD_RIGHT, BEAM_Y, c],
    [FOLD_RIGHT, BEAM_Y, d],
    [FOLD_LEFT, BEAM_Y, d],
    [FOLD_LEFT, RETURN_PATH_Y, d],
    [FOLD_LEFT, RETURN_PATH_Y, exit[2]],
    exit,
  ];
}

function foldBoxes(batch: Batch, path: readonly Point[]): void {
  path.slice(1).forEach(([x, y, z]) => {
    batch.add(GROUP, 'darkFrame', roundedBlock([x, y, z], [FOLD_SIZE, FOLD_SIZE, FOLD_SIZE], 0.02));
    batch.add(
      GROUP,
      'flange',
      block([x, y, z + FOLD_SIZE / 2], [FOLD_SIZE * 0.6, FOLD_SIZE * 0.6, 0.01]),
    );
  });
}

function beam(batch: Batch): void {
  const path = beamPath();
  path.slice(1).forEach((point, index) => {
    batch.add(GROUP, 'laserGlow', rod(path[index], point, BEAM_RADIUS, 8));
  });
  foldBoxes(batch, path);
}

function amplifier(batch: Batch, z: number): void {
  const length = AMP.maxX - AMP.minX;
  const centre = (AMP.minX + AMP.maxX) / 2;
  const middle: Point = [centre, BEAM_Y, z];
  batch.add(GROUP, 'laserCase', roundedBlock(middle, [length, AMP.height, AMP.width], 0.035));
  STRIPES.forEach((offset) => {
    const stripe = block(
      [centre + offset * length * 0.8, BEAM_Y, z],
      [STRIPE_WIDTH, AMP.height + 0.012, AMP.width + 0.012],
    );
    batch.add(GROUP, 'accent', stripe);
  });
  [AMP.minX, AMP.maxX].forEach((end, index) => {
    const outward = index === 0 ? -1 : 1;
    batch.add(
      GROUP,
      'darkFrame',
      block([end, BEAM_Y, z], [0.07, AMP.height + 0.03, AMP.width + 0.03]),
    );
    const face: Point = [end + outward * 0.035, BEAM_Y, z];
    batch.add(GROUP, 'flange', washer(face, new Vector3(outward, 0, 0), 0.04, 0.1, 0.03));
    batch.boltRing(GROUP, face, new Vector3(outward, 0, 0), 0.075, END_BOLTS, END_BOLT_SIZE);
  });
  [-0.55, 0.55].forEach((offset) => {
    const footY = BEAM_Y - AMP.height / 2 - AMP.foot / 2;
    batch.add(
      GROUP,
      'darkFrame',
      block([centre + offset, footY, z], [0.2, AMP.foot, AMP.width * 0.9]),
    );
  });
  const topY = BEAM_Y + AMP.height / 2;
  batch.add(GROUP, 'tray', block([centre - 0.55, topY + 0.015, z], [0.5, 0.03, 0.2]));
}

function cabinet(batch: Batch, z: number, x: number): void {
  const bottom = BEAM_Y + AMP.height / 2 + 0.03;
  const y = bottom + CABINET.height / 2;
  batch.add(
    GROUP,
    'panel',
    roundedBlock([x, y, z], [CABINET.width, CABINET.height, CABINET.depth], 0.025),
  );
  batch.add(
    GROUP,
    'accent',
    block([x, y + CABINET.height * 0.3, z], [CABINET.width + 0.01, 0.04, CABINET.depth + 0.01]),
  );
  const front = z + CABINET.depth / 2;
  [-0.08, 0, 0.08].forEach((offset) => {
    batch.add(GROUP, 'darkFrame', block([x - 0.1, y + offset - 0.03, front], [0.28, 0.025, 0.012]));
  });
  batch.add(
    GROUP,
    'flange',
    bar([x + 0.2, y - 0.1, front + 0.02], [x + 0.2, y + 0.1, front + 0.02], 0.02),
  );
  const lead = runPipe(
    [
      [x, y + CABINET.height / 2, z],
      [x, TRAY_Y + 0.25, z],
      [TRAY_X, TRAY_Y + 0.25, z],
      [TRAY_X, TRAY_Y + 0.05, z],
    ],
    0.02,
    0.15,
  );
  batch.add(GROUP, 'cable', lead);
}

function cooling(batch: Batch): void {
  const [first, , , last] = AMP_ROWS;
  batch.add(
    GROUP,
    'copper',
    rod([MANIFOLD_X, MANIFOLD_Y, first - 0.2], [MANIFOLD_X, MANIFOLD_Y, last + 0.2], 0.04, 12),
  );
  AMP_ROWS.forEach((z) => {
    const hose = runPipe(
      [
        [AMP.maxX, MANIFOLD_Y, z],
        [MANIFOLD_X + 0.25, MANIFOLD_Y, z],
        [MANIFOLD_X, MANIFOLD_Y, z],
      ],
      0.026,
      0.1,
    );
    batch.add(GROUP, 'rubber', hose);
    batch.add(
      GROUP,
      'accent',
      rod([MANIFOLD_X + 0.3, MANIFOLD_Y, z], [MANIFOLD_X + 0.36, MANIFOLD_Y, z], 0.036, 10),
    );
    batch.add(GROUP, 'darkFrame', washer([MANIFOLD_X, MANIFOLD_Y, z], AXIS_X, 0.04, 0.07, 0.03));
  });
  batch.add(
    GROUP,
    'copper',
    rod([MANIFOLD_X, MANIFOLD_Y, last + 0.2], [MANIFOLD_X, ROOM.y[1] - 0.45, last + 0.2], 0.04, 12),
  );
}

function seedBox(batch: Batch): void {
  const z = AMP_ROWS[0];
  const centre: Point = [(SEED.minX + SEED.maxX) / 2, BEAM_Y, z];
  const size: Point = [SEED.maxX - SEED.minX, 0.4, SEED.half * 2];
  batch.add(GROUP, 'panel', roundedBlock(centre, size, 0.03));
  batch.add(
    GROUP,
    'accent',
    block([centre[0], BEAM_Y + 0.14, z], [size[0] + 0.01, 0.045, size[2] + 0.01]),
  );
  batch.add(
    GROUP,
    'darkFrame',
    block([centre[0] - 0.05, BEAM_Y - 0.06, z + size[2] / 2], [0.25, 0.14, 0.012]),
  );
  batch.add(
    GROUP,
    'darkFrame',
    block([centre[0], FLOOR_Y + 0.06, z], [size[0] * 0.9, 0.12, size[2] * 0.9]),
  );
}

function cableTray(batch: Batch): void {
  const [first, , , last] = AMP_ROWS;
  const from: Point = [TRAY_X, TRAY_Y, first - 0.2];
  const to: Point = [TRAY_X, TRAY_Y, last + 0.2];
  batch.add(
    GROUP,
    'tray',
    span([TRAY_X - 0.12, TRAY_Y - 0.03, from[2]], [TRAY_X + 0.12, TRAY_Y, to[2]]),
  );
  [-1, 1].forEach((side) => {
    const edge = TRAY_X + side * 0.12;
    batch.add(
      GROUP,
      'tray',
      span([edge - 0.012, TRAY_Y, from[2]], [edge + 0.012, TRAY_Y + 0.05, to[2]]),
    );
  });
  [-0.05, 0.05].forEach((offset) => {
    batch.add(
      GROUP,
      'cable',
      rod(
        [TRAY_X + offset, TRAY_Y + 0.025, from[2]],
        [TRAY_X + offset, TRAY_Y + 0.025, to[2]],
        0.02,
        8,
      ),
    );
  });
  batch.add(
    GROUP,
    'tray',
    bar([TRAY_X, TRAY_Y + 0.05, to[2] - 0.05], [TRAY_X, ROOM.y[1] - 0.1, to[2] - 0.05], 0.03),
  );
}

export function buildLaserChain(batch: Batch): void {
  beam(batch);
  seedBox(batch);
  AMP_ROWS.forEach((z, index) => {
    amplifier(batch, z);
    cabinet(batch, z, CABINET_X[index]);
  });
  cooling(batch);
  cableTray(batch);
}
