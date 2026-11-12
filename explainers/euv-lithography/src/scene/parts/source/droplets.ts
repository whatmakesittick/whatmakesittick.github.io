import { CylinderGeometry, Vector3 } from 'three';
import type { Point } from '../../../ids';
import type { Batch } from '../fab/batch';
import {
  AXIS_Y as UP,
  bar,
  block,
  disc,
  halfRod,
  rod,
  roundedBlock,
  runPipe,
  washer,
} from '../fab/shapes';
import { AXIS_Y, GENERATOR, VESSEL_TOP_Y } from './dims';

const GROUP = 'droplets';
const { x: GX, y: GY, size: SIZE, nozzleY: NOZZLE_Y } = GENERATOR;
const HOUSING_HEIGHT = 0.24;
const HOUSING_TOP = NOZZLE_Y + HOUSING_HEIGHT;
const RESERVOIR_TOP = GY + SIZE / 2;
const RESERVOIR_R = 0.16;
const BAND_R = 0.175;
const NECK_R = 0.09;
const NECK_BASE = VESSEL_TOP_Y - 0.03;
const BOLT = 0.02;
const FUNNEL = { x: GX, top: 0.5, bottom: 0.34, outer: 0.14, inner: 0.04 } as const;
const DRAIN_BOTTOM = 0.08;
const CAN = { bottom: 0.02, top: 0.16, radius: 0.13 } as const;
const NECK_RIM = 0.009;
const DOWN = new Vector3(0, -1, 0);

function housing(batch: Batch): void {
  const centre: Point = [GX, NOZZLE_Y + HOUSING_HEIGHT / 2, 0];
  batch.add(GROUP, 'panel', roundedBlock(centre, [SIZE, HOUSING_HEIGHT, SIZE], 0.03));
  batch.add(GROUP, 'darkFrame', block([GX, HOUSING_TOP + 0.012, 0], [SIZE, 0.024, SIZE]));
  batch.add(GROUP, 'darkFrame', block([GX, NOZZLE_Y + 0.012, 0], [SIZE, 0.024, SIZE]));
  batch.add(GROUP, 'accent', block([GX, centre[1], SIZE / 2 + 0.002], [SIZE * 0.9, 0.035, 0.008]));
  const front = SIZE / 2 + 0.006;
  batch.add(GROUP, 'darkFrame', block([GX - 0.06, centre[1] - 0.01, front], [0.22, 0.12, 0.012]));
  batch.add(
    GROUP,
    'flange',
    bar(
      [GX + 0.12, centre[1] - 0.04, front + 0.015],
      [GX + 0.12, centre[1] + 0.04, front + 0.015],
      0.02,
    ),
  );
  [-0.1, 0.1].forEach((dx) =>
    [-0.05, 0.03].forEach((dy) => {
      batch.bolt(
        GROUP,
        [GX - 0.06 + dx, centre[1] + dy, front + 0.006],
        new Vector3(0, 0, 1),
        BOLT,
      );
    }),
  );
  [-1, 1].forEach((sx) =>
    [-1, 1].forEach((sz) => {
      batch.bolt(
        GROUP,
        [GX + sx * (SIZE / 2 - 0.03), HOUSING_TOP + 0.024, sz * (SIZE / 2 - 0.03)],
        UP,
        BOLT,
      );
    }),
  );
  [-0.07, 0, 0.07].forEach((dx) =>
    batch.add(
      GROUP,
      'darkFrame',
      block([GX + 0.1, centre[1] + dx, -SIZE / 2 - 0.004], [0.2, 0.025, 0.01]),
    ),
  );
}

function reservoir(batch: Batch): void {
  batch.add(
    GROUP,
    'tin',
    rod([GX, HOUSING_TOP, 0], [GX, RESERVOIR_TOP - 0.02, 0], RESERVOIR_R, 24),
  );
  [0.08, 0.14, 0.2].forEach((rise) => {
    batch.add(
      GROUP,
      'copper',
      rod([GX, HOUSING_TOP + rise, 0], [GX, HOUSING_TOP + rise + 0.035, 0], BAND_R, 24),
    );
  });
  batch.add(GROUP, 'flange', disc([GX, RESERVOIR_TOP - 0.01, 0], UP, 0.2, 0.03, 24));
  batch.boltRing(GROUP, [GX, RESERVOIR_TOP + 0.005, 0], UP, 0.16, 8, BOLT);
  batch.add(
    GROUP,
    'darkFrame',
    rod([GX, RESERVOIR_TOP, 0], [GX, RESERVOIR_TOP + 0.09, 0], 0.045, 12),
  );
  const line: Point[] = [
    [GX, RESERVOIR_TOP + 0.09, 0],
    [GX, RESERVOIR_TOP + 0.26, 0],
    [GX + 0.4, RESERVOIR_TOP + 0.26, 0],
    [GX + 0.4, NOZZLE_Y + 0.12, 0],
    [GX + SIZE / 2 + 0.01, NOZZLE_Y + 0.12, 0],
  ];
  batch.add(GROUP, 'flange', runPipe(line, 0.025, 0.15));
  [-0.1, 0.1].forEach((dz) => {
    const lead = runPipe(
      [
        [GX - 0.17, HOUSING_TOP + 0.14, dz],
        [GX - 0.3, HOUSING_TOP + 0.14, dz],
        [GX - SIZE / 2 - 0.005, HOUSING_TOP - 0.06, dz],
      ],
      0.012,
      0.06,
    );
    batch.add(GROUP, 'darkFrame', lead);
  });
}

function neck(batch: Batch): void {
  const from: Point = [GX, NECK_BASE, 0];
  const to: Point = [GX, NOZZLE_Y, 0];
  batch.add(GROUP, 'shell', halfRod(from, to, NECK_R, 'back', 16));
  batch.add(GROUP, 'shellInner', halfRod(from, to, NECK_R - 0.01, 'back', 16));
  batch.add(GROUP, 'shell', halfRod(from, to, NECK_R, 'front', 16), true);
  [-1, 1].forEach((side) => {
    batch.add(
      GROUP,
      'flange',
      rod([GX + side * NECK_R, NECK_BASE, 0], [GX + side * NECK_R, NOZZLE_Y, 0], NECK_RIM, 6),
    );
  });
  [VESSEL_TOP_Y + 0.02, NOZZLE_Y - 0.04].forEach((y) => {
    batch.add(GROUP, 'flange', washer([GX, y, 0], UP, NECK_R * 0.98, 0.17, 0.035));
    batch.boltRing(GROUP, [GX, y + 0.0175, 0], UP, 0.14, 8, 0.015);
  });
  batch.add(
    GROUP,
    'tin',
    new CylinderGeometry(0.05, 0.015, 0.08, 14).translate(GX, NOZZLE_Y - 0.1, 0),
  );
  [-1, 1].forEach((side) => {
    batch.add(
      GROUP,
      'darkFrame',
      bar([GX + side * 0.2, NOZZLE_Y, 0], [GX + side * 0.34, VESSEL_TOP_Y - 0.05, 0], 0.045, 0.1),
    );
  });
}

function catcher(batch: Batch): void {
  const { x, top, bottom, outer, inner } = FUNNEL;
  const cone = new CylinderGeometry(outer, inner, top - bottom, 18, 1, true).translate(
    x,
    (top + bottom) / 2,
    0,
  );
  batch.add(GROUP, 'shellInner', cone);
  batch.add(GROUP, 'tin', washer([x, top, 0], UP, outer - 0.012, outer + 0.025, 0.02));
  batch.add(GROUP, 'darkFrame', rod([x, DRAIN_BOTTOM, 0], [x, bottom, 0], inner, 12));
  batch.add(GROUP, 'flange', washer([x, AXIS_Y - 0.9 - 0.012, 0], UP, inner * 0.9, 0.12, 0.03));
  batch.boltRing(GROUP, [x, AXIS_Y - 0.9 - 0.027, 0], DOWN, 0.1, 6, 0.014);
  batch.add(GROUP, 'darkFrame', rod([x, CAN.bottom, 0], [x, CAN.top, 0], CAN.radius, 20));
  batch.add(
    GROUP,
    'accent',
    rod([x, CAN.bottom + 0.03, 0], [x, CAN.bottom + 0.06, 0], CAN.radius + 0.006, 20),
  );
  batch.add(GROUP, 'flange', disc([x, CAN.top + 0.01, 0], UP, CAN.radius + 0.01, 0.02, 20));
}

export function buildDroplets(batch: Batch): void {
  housing(batch);
  reservoir(batch);
  neck(batch);
  catcher(batch);
}
