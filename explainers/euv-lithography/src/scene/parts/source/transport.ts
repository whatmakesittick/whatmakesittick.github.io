import { Vector2, Vector3 } from 'three';
import type { Point } from '../../../ids';
import type { Batch } from '../fab/batch';
import {
  AXIS_X,
  AXIS_Y,
  block,
  disc,
  halfArc,
  halfRod,
  profileTube,
  ringAlongX,
  rod,
  roundedBlock,
  washer,
} from '../fab/shapes';
import type { Side } from '../fab/shapes';
import { BOX_SIZE, BOX_X, BOX_Y, BOX_Z, HEAD_X, ROOF_Y, TUBE_R } from './dims';

const GROUP = 'beamTransport';
const WALL_GAP = 0.012;
const RIM_RADIUS = 0.01;
const FLANGE_R = 0.2;
const FLANGE_T = 0.04;
const FLANGE_BOLT_R = 0.165;
const FLANGE_BOLTS = 8;
const BOLT = 0.014;
const FLANGE_PITCH = 0.8;
const FIRST_FLANGE_Y = -0.7;
const BELLOWS_PEAK = 0.145;
const BELLOWS_VALLEY = 0.115;
const BELLOWS_PLEATS = 10;
const END_X = HEAD_X - 0.2;
const RUN_FLANGES: readonly number[] = [-5.5, -4.7, END_X];
const BELLOWS_RANGE: readonly [number, number] = [BOX_X + BOX_SIZE / 2, RUN_FLANGES[0]];
const POSTS: readonly number[] = [-5.1, -4.6];
const POST_SIZE = 0.1;
const PLATE = 0.3;
const PLATE_T = 0.03;
const HALF = BOX_SIZE / 2;
const FACE_R = 0.17;
const COVER_R = 0.12;

interface Face {
  normal: Point;
  kind: 'tube' | 'blank' | 'window' | 'access';
}

const FACES: readonly Face[] = [
  { normal: [0, -1, 0], kind: 'tube' },
  { normal: [1, 0, 0], kind: 'tube' },
  { normal: [0, 1, 0], kind: 'blank' },
  { normal: [-1, 0, 0], kind: 'window' },
  { normal: [0, 0, -1], kind: 'blank' },
  { normal: [0, 0, 1], kind: 'access' },
];

function shellRun(batch: Batch, from: Point, to: Point): void {
  (['back', 'front'] as Side[]).forEach((side) => {
    const ghost = side === 'front';
    batch.add(GROUP, 'shell', halfRod(from, to, TUBE_R, side, 16), ghost);
    if (!ghost) batch.add(GROUP, 'shellInner', halfRod(from, to, TUBE_R - WALL_GAP, side, 16));
  });
  const horizontal = from[0] !== to[0];
  [-1, 1].forEach((sign) => {
    const [a, b]: [Point, Point] = horizontal
      ? [
          [from[0], from[1] + sign * TUBE_R, 0],
          [to[0], to[1] + sign * TUBE_R, 0],
        ]
      : [
          [from[0] + sign * TUBE_R, from[1], 0],
          [to[0] + sign * TUBE_R, to[1], 0],
        ];
    batch.add(GROUP, 'flange', rod(a, b, RIM_RADIUS, 6));
  });
}

function bellows(batch: Batch): void {
  const [start, end] = BELLOWS_RANGE;
  const pitch = (end - start) / BELLOWS_PLEATS;
  const profile: Vector2[] = [new Vector2(BELLOWS_VALLEY, start)];
  for (let pleat = 0; pleat < BELLOWS_PLEATS; pleat += 1) {
    const x = start + pleat * pitch;
    profile.push(
      new Vector2(BELLOWS_PEAK, x + pitch * 0.35),
      new Vector2(BELLOWS_PEAK, x + pitch * 0.65),
    );
    profile.push(new Vector2(BELLOWS_VALLEY, x + pitch));
  }
  batch.add(GROUP, 'shellInner', profileTube(profile, halfArc('back'), BOX_Y));
  batch.add(GROUP, 'shellInner', profileTube(profile, halfArc('front'), BOX_Y), true);
}

function flange(batch: Batch, at: Point, normal: Vector3): void {
  batch.add(GROUP, 'flange', washer(at, normal, TUBE_R * 0.98, FLANGE_R, FLANGE_T));
  const lift = normal.clone().multiplyScalar(FLANGE_T / 2);
  [1, -1].forEach((sign) => {
    const face: Point = [at[0] + lift.x * sign, at[1] + lift.y * sign, at[2] + lift.z * sign];
    batch.boltRing(
      GROUP,
      face,
      normal.clone().multiplyScalar(sign),
      FLANGE_BOLT_R,
      FLANGE_BOLTS,
      BOLT,
    );
  });
}

function faceFitting(batch: Batch, face: Face): void {
  const normal = new Vector3(...face.normal);
  const at = (distance: number): Point => [
    BOX_X + normal.x * distance,
    BOX_Y + normal.y * distance,
    BOX_Z + normal.z * distance,
  ];
  const outer = at(HALF + FLANGE_T / 2);
  batch.add(
    GROUP,
    'flange',
    face.kind === 'tube'
      ? washer(outer, normal, TUBE_R * 0.98, FACE_R, FLANGE_T)
      : disc(outer, normal, FACE_R, FLANGE_T),
  );
  batch.boltRing(GROUP, at(HALF + FLANGE_T), normal, FACE_R * 0.82, FLANGE_BOLTS, BOLT);
  if (face.kind === 'tube') return;
  const coverAt = at(HALF + FLANGE_T + 0.015);
  if (face.kind === 'window') {
    batch.add(GROUP, 'window', disc(coverAt, normal, COVER_R * 0.8, 0.02));
    batch.add(GROUP, 'darkFrame', washer(coverAt, normal, COVER_R * 0.8, COVER_R, 0.03));
    return;
  }
  batch.add(GROUP, 'panel', disc(coverAt, normal, COVER_R, 0.03));
  if (face.kind === 'access') {
    const handle = at(HALF + FLANGE_T + 0.05);
    batch.add(GROUP, 'darkFrame', block(handle, [0.14, 0.03, 0.03]));
  }
}

function mirrorBox(batch: Batch): void {
  const size = BOX_SIZE;
  batch.add(GROUP, 'frame', roundedBlock([BOX_X, BOX_Y, BOX_Z], [size, size, size], 0.03));
  FACES.forEach((face) => faceFitting(batch, face));
}

function posts(batch: Batch): void {
  POSTS.forEach((x) => {
    const top = BOX_Y - TUBE_R - 0.02;
    batch.add(GROUP, 'darkFrame', block([x, top / 2, BOX_Z], [POST_SIZE, top, POST_SIZE]));
    batch.add(GROUP, 'frame', block([x, PLATE_T / 2, BOX_Z], [PLATE, PLATE_T, PLATE]));
    batch.add(GROUP, 'darkFrame', block([x, top + 0.005, BOX_Z], [0.2, 0.05, 0.16]));
    batch.add(GROUP, 'flange', ringAlongX(x, TUBE_R + 0.012, 0.012, undefined, BOX_Y));
    [-1, 1].forEach((sx) =>
      [-1, 1].forEach((sz) => {
        batch.bolt(
          GROUP,
          [x + sx * PLATE * 0.38, PLATE_T, BOX_Z + sz * PLATE * 0.38],
          AXIS_Y,
          0.02,
        );
      }),
    );
  });
}

export function buildTransport(batch: Batch): void {
  const lowest = ROOF_Y - 0.05;
  const boxBottom = BOX_Y - HALF;
  shellRun(batch, [BOX_X, lowest, BOX_Z], [BOX_X, boxBottom, BOX_Z]);
  shellRun(batch, [RUN_FLANGES[0], BOX_Y, BOX_Z], [END_X, BOX_Y, BOX_Z]);
  bellows(batch);
  for (let y = FIRST_FLANGE_Y; y < boxBottom; y += FLANGE_PITCH)
    flange(batch, [BOX_X, y, BOX_Z], AXIS_Y);
  RUN_FLANGES.forEach((x) => flange(batch, [x, BOX_Y, BOX_Z], AXIS_X));
  mirrorBox(batch);
  posts(batch);
}
