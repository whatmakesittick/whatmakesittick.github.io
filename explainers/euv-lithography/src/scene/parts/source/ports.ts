import { Vector3 } from 'three';
import type { Point } from '../../../ids';
import type { Batch } from '../fab/batch';
import { block, disc, rod, runPipe } from '../fab/shapes';
import { AXIS_Y, SHELL_R } from './dims';

const GROUP = 'vessel';
const DEGREES = Math.PI / 180;
const STUB_REACH = 0.14;
const COVER_LIFT = 0.03;

export interface PortSpec {
  x: number;
  angle: number;
  radius: number;
  kind: 'blind' | 'gas' | 'coolant';
}

export const PORTS: readonly PortSpec[] = [
  { x: -3.9, angle: -40, radius: 0.1, kind: 'gas' },
  { x: -2.2, angle: -40, radius: 0.1, kind: 'gas' },
  { x: -3.55, angle: 50, radius: 0.09, kind: 'blind' },
  { x: -2.0, angle: 115, radius: 0.1, kind: 'blind' },
  { x: -1.1, angle: 70, radius: 0.08, kind: 'blind' },
  { x: -3.85, angle: -70, radius: 0.07, kind: 'coolant' },
  { x: -3.85, angle: -110, radius: 0.07, kind: 'coolant' },
];

export function radialDirection(angle: number): Vector3 {
  return new Vector3(0, Math.cos(angle * DEGREES), Math.sin(angle * DEGREES));
}

export function surfacePoint(x: number, angle: number, distance = SHELL_R): Point {
  const direction = radialDirection(angle);
  return [x, AXIS_Y + direction.y * distance, direction.z * distance];
}

function port(batch: Batch, spec: PortSpec): void {
  const { x, angle, radius, kind } = spec;
  const direction = radialDirection(angle);
  const base = surfacePoint(x, angle, SHELL_R - 0.05);
  const tip = surfacePoint(x, angle, SHELL_R + STUB_REACH);
  const finish = kind === 'coolant' ? 'copper' : 'darkFrame';
  batch.add(GROUP, finish, rod(base, tip, radius, 14));
  batch.add(GROUP, 'flange', disc(tip, direction, radius * 1.5, 0.035, 16));
  const cover = surfacePoint(x, angle, SHELL_R + STUB_REACH + COVER_LIFT);
  batch.add(
    GROUP,
    kind === 'blind' ? 'panel' : 'darkFrame',
    disc(cover, direction, radius * 1.15, 0.025, 14),
  );
  batch.boltRing(
    GROUP,
    surfacePoint(x, angle, SHELL_R + STUB_REACH + 0.0175),
    direction,
    radius * 1.28,
    8,
    radius * 0.16,
  );
}

const COVER_DISTANCE = SHELL_R + STUB_REACH + COVER_LIFT;
const GAS_PANEL: Point = [-4.8, 0.3, -1.4];
const GAS_PANEL_SIZE: Point = [0.5, 0.6, 0.35];
const GAS_RADIUS = 0.04;
const GAS_BEND = 0.2;

function gasLines(batch: Batch): void {
  const lines: readonly (readonly Point[])[] = [
    [
      surfacePoint(-3.9, -40, COVER_DISTANCE),
      surfacePoint(-3.9, -40, 1.35),
      [-4.8, 2.25, -0.87],
      [-4.8, 2.25, -1.4],
      [-4.8, 0.6, -1.4],
    ],
    [
      surfacePoint(-2.2, -40, COVER_DISTANCE),
      surfacePoint(-2.2, -40, 1.45),
      [-4.65, 2.4, -0.95],
      [-4.65, 2.4, -1.3],
      [-4.65, 0.6, -1.3],
    ],
  ];
  lines.forEach((points) => batch.add(GROUP, 'flange', runPipe(points, GAS_RADIUS, GAS_BEND)));
  const [x, y, z] = GAS_PANEL;
  batch.add(GROUP, 'darkFrame', block(GAS_PANEL, GAS_PANEL_SIZE));
  batch.add(GROUP, 'accent', block([x, y + 0.2, z + GAS_PANEL_SIZE[2] / 2], [0.46, 0.05, 0.015]));
  batch.add(GROUP, 'darkFrame', block([x, 0.02, z], [0.58, 0.04, 0.42]));
  [-0.12, 0.12].forEach((offset) => {
    batch.add(
      GROUP,
      'flange',
      disc(
        [x + offset, y - 0.05, z + GAS_PANEL_SIZE[2] / 2 + 0.01],
        new Vector3(0, 0, 1),
        0.05,
        0.02,
        14,
      ),
    );
  });
}

export function buildPorts(batch: Batch): void {
  PORTS.forEach((spec) => port(batch, spec));
  gasLines(batch);
}
