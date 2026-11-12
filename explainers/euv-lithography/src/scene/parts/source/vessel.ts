import { Vector2, Vector3 } from 'three';
import type { Point } from '../../../ids';
import type { Batch } from '../fab/batch';
import {
  AXIS_X,
  block,
  bar,
  halfArc,
  halfRod,
  polyTube,
  profileTube,
  ringAlongX,
  washer,
} from '../fab/shapes';
import type { Side } from '../fab/shapes';
import {
  AXIS_Y,
  BODY_END,
  BODY_START,
  END_X,
  HEAD_X,
  PORT_R,
  SHELL_R,
  SKIN_GAP,
  WINDOW,
} from './dims';
import { sections, vesselProfile } from './profiles';

const GROUP = 'vessel';
const RIM_TUBE = 0.014;
const JOINTS: readonly number[] = [BODY_START, -2.85, BODY_END];
const JOINT_PLATE = 0.045;
const GASKET = 0.02;
const JOINT_OUTER = 1.0;
const JOINT_BOLTS = 14;
const BOLT = 0.024;
const STIFFENERS: readonly number[] = [-3.62, -2.38, -1.25, -0.95];
const STIFFENER_WIDTH = 0.05;
const CONE_SLOPE = 0.806;
const SADDLES: readonly number[] = [-3.7, -1.9];
const SADDLE_WIDTH = 0.14;
const FOOT_T = 0.04;
const COLLAR_T = 0.05;
const COLLAR_R = 0.23;
const COLLAR_X = HEAD_X - 0.155;
const NECK_FLANGE_X = END_X - 0.03;

function skin(batch: Batch, side: Side): void {
  const outer = vesselProfile();
  const inner = vesselProfile(SKIN_GAP);
  const ghost = side === 'front';
  sections(outer, side).forEach(({ profile, arc }) => {
    batch.add(GROUP, 'shell', profileTube(profile, arc, AXIS_Y), ghost);
  });
  if (!ghost) {
    batch.add(GROUP, 'shellInner', profileTube(inner, halfArc(side), AXIS_Y));
  }
}

function rim(batch: Batch): void {
  const outer = vesselProfile();
  [-1, 1].forEach((sign) => {
    const points: Point[] = outer.map((point): Point => [point.y, AXIS_Y + sign * point.x, 0]);
    batch.add(GROUP, 'flange', polyTube(points, RIM_TUBE));
  });
}

function windowFrame(batch: Batch): void {
  const { x0, x1, half } = WINDOW;
  const radius = SHELL_R + 0.012;
  const reach = 0.03;
  [x0, x1].forEach((x) => {
    const arc = { start: -half, length: half * 2 };
    batch.add(GROUP, 'frame', ringAlongX(x, radius, reach / 2, arc, AXIS_Y));
  });
  [-1, 1].forEach((sign) => {
    const y = AXIS_Y + radius * Math.sin(sign * half);
    const z = radius * Math.cos(half);
    batch.add(GROUP, 'frame', bar([x0, y, z], [x1, y, z], reach, reach));
    batch.bolt(GROUP, [(x0 + x1) / 2, y + sign * 0.02, z], new Vector3(0, sign, 0), BOLT);
  });
  const glass = profileTube(
    [new Vector2(SHELL_R + 0.004, x0), new Vector2(SHELL_R + 0.004, x1)],
    { start: -half, length: half * 2 },
    AXIS_Y,
  );
  batch.add(GROUP, 'window', glass);
  for (let step = 1; step < 5; step += 1) {
    const x = x0 + ((x1 - x0) * step) / 5;
    const angle = half;
    [-angle, angle].forEach((a) => {
      batch.bolt(
        GROUP,
        [x, AXIS_Y + radius * Math.sin(a), radius * Math.cos(a)],
        new Vector3(0, Math.sin(a), Math.cos(a)),
        BOLT,
      );
    });
  }
}

function joints(batch: Batch): void {
  JOINTS.forEach((x) => {
    const offset = GASKET / 2 + JOINT_PLATE / 2;
    [-1, 1].forEach((sign) => {
      const plate: Point = [x + sign * offset, AXIS_Y, 0];
      batch.add(GROUP, 'flange', washer(plate, AXIS_X, SHELL_R, JOINT_OUTER, JOINT_PLATE));
      const faceX = x + sign * (offset + JOINT_PLATE / 2);
      batch.boltRing(
        GROUP,
        [faceX, AXIS_Y, 0],
        AXIS_X.clone().multiplyScalar(sign),
        (SHELL_R + JOINT_OUTER) / 2,
        JOINT_BOLTS,
        BOLT,
      );
    });
    batch.add(GROUP, 'rubber', washer([x, AXIS_Y, 0], AXIS_X, SHELL_R, JOINT_OUTER - 0.02, GASKET));
  });
}

function stiffeners(batch: Batch): void {
  STIFFENERS.forEach((x) => {
    const radius = x > BODY_END ? SHELL_R - (x - BODY_END) * CONE_SLOPE : SHELL_R;
    batch.add(
      GROUP,
      'frame',
      washer([x, AXIS_Y, 0], AXIS_X, radius - 0.02, radius + 0.07, STIFFENER_WIDTH),
    );
  });
}

function saddles(batch: Batch): void {
  SADDLES.forEach((x) => {
    batch.add(
      GROUP,
      'darkFrame',
      washer([x, AXIS_Y, 0], AXIS_X, SHELL_R, SHELL_R + 0.07, SADDLE_WIDTH),
    );
    const legTop = AXIS_Y - SHELL_R * 0.55;
    [-1, 1].forEach((sign) => {
      const z = sign * SHELL_R * 0.78;
      batch.add(GROUP, 'darkFrame', block([x, legTop / 2, z], [SADDLE_WIDTH, legTop, 0.1]));
      batch.bolt(GROUP, [x, FOOT_T, z + sign * 0.2], new Vector3(0, 1, 0), BOLT);
    });
    batch.add(
      GROUP,
      'frame',
      block([x, FOOT_T / 2, 0], [SADDLE_WIDTH + 0.06, FOOT_T, SHELL_R * 2.2]),
    );
  });
}

function entryCollar(batch: Batch): void {
  const from: Point = [COLLAR_X, AXIS_Y, 0];
  const to: Point = [vesselProfile()[0].y + 0.01, AXIS_Y, 0];
  batch.add(GROUP, 'shell', halfRod(from, to, PORT_R, 'back', 16));
  batch.add(GROUP, 'shell', halfRod(from, to, PORT_R, 'front', 16), true);
  batch.add(GROUP, 'flange', washer(from, AXIS_X, PORT_R * 0.9, COLLAR_R, COLLAR_T));
  const face = AXIS_X.clone().multiplyScalar(-1);
  batch.boltRing(GROUP, [COLLAR_X - COLLAR_T / 2, AXIS_Y, 0], face, COLLAR_R * 0.82, 8, 0.016);
}

function neckEnd(batch: Batch): void {
  batch.add(
    'intermediateFocus',
    'flange',
    washer([NECK_FLANGE_X, AXIS_Y, 0], AXIS_X, 0.1, 0.23, 0.04),
  );
  batch.boltRing('intermediateFocus', [END_X - 0.01, AXIS_Y, 0], AXIS_X, 0.18, 10, 0.016);
}

export function buildVessel(batch: Batch): void {
  skin(batch, 'back');
  skin(batch, 'front');
  rim(batch);
  windowFrame(batch);
  joints(batch);
  stiffeners(batch);
  saddles(batch);
  entryCollar(batch);
  neckEnd(batch);
}
