import { Vector2, Vector3 } from 'three';
import type { Point } from '../../../ids';
import type { Batch } from '../fab/batch';
import { bar, halfArc, polyTube, profileTube, ringAlongX, rod } from '../fab/shapes';
import type { Side } from '../fab/shapes';
import {
  AXIS_Y,
  COLLECTOR_APEX_X,
  COLLECTOR_AXIAL,
  COLLECTOR_RIM_R,
  COLLECTOR_RIM_X,
  COLLECTOR_THICKNESS,
  SHELL_R,
  STREAM_SLOT,
} from './dims';
import { LIT_RIM, MIRROR_BOWL } from './finishes';
import { collectorProfile, sections } from './profiles';

const GROUP = 'collector';
const SIDES: readonly Side[] = ['back', 'front'];
const COOLING_RADII: readonly number[] = [0.32, 0.45, 0.56];
const COOLING_TUBE = 0.014;
const RIB_ANGLES: readonly number[] = [45, 135, 225, 315];
const RIB_TUBE = 0.012;
const RIM_FLANGE = { inner: 0.68, outer: 0.76, thickness: 0.05 } as const;
const RIM_BOLTS = 16;
const STRUT_END_X = COLLECTOR_RIM_X + 0.25;
const COOLANT_ANGLES: readonly number[] = [-70, -110];
const COOLANT_RADIUS = 0.025;
const DEGREES = Math.PI / 180;

function backX(radius: number): number {
  const depth = Math.sqrt(1 - (radius / COLLECTOR_RIM_R) ** 2);
  return COLLECTOR_RIM_X - COLLECTOR_AXIAL * depth - COLLECTOR_THICKNESS;
}

function onAxis(x: number, radius: number, angle: number): Point {
  return [x, AXIS_Y + radius * Math.cos(angle * DEGREES), radius * Math.sin(angle * DEGREES)];
}

function faces(batch: Batch, side: Side): void {
  const ghost = side === 'front';
  sections(collectorProfile(), side, STREAM_SLOT).forEach(({ profile, arc }) => {
    batch.add(GROUP, MIRROR_BOWL, profileTube([...profile].reverse(), arc, AXIS_Y), ghost);
  });
  sections(collectorProfile(-COLLECTOR_THICKNESS), side, STREAM_SLOT).forEach(
    ({ profile, arc }) => {
      batch.add(GROUP, 'ceramic', profileTube(profile, arc, AXIS_Y), ghost);
    },
  );
}

function rimRing(batch: Batch, side: Side): void {
  const { inner, outer, thickness } = RIM_FLANGE;
  const x = COLLECTOR_RIM_X - thickness / 2;
  const profile = [
    new Vector2(inner, x - thickness / 2),
    new Vector2(outer, x - thickness / 2),
    new Vector2(outer, x + thickness / 2),
    new Vector2(inner, x + thickness / 2),
    new Vector2(inner, x - thickness / 2),
  ];
  const arc = halfArc(side, STREAM_SLOT);
  batch.add(GROUP, LIT_RIM, profileTube(profile, arc, AXIS_Y), side === 'front');
  const hole = ringAlongX(
    COLLECTOR_APEX_X - COLLECTOR_THICKNESS / 2,
    collectorProfile()[0].x,
    0.022,
    arc,
    AXIS_Y,
  );
  batch.add(GROUP, LIT_RIM, hole, side === 'front');
}

function cooling(batch: Batch, side: Side): void {
  const arc = halfArc(side, STREAM_SLOT);
  COOLING_RADII.forEach((radius) => {
    const ring = ringAlongX(backX(radius) - COOLING_TUBE * 0.6, radius, COOLING_TUBE, arc, AXIS_Y);
    batch.add(GROUP, 'copper', ring, side === 'front');
  });
}

function ribs(batch: Batch): void {
  const surface = collectorProfile(-COLLECTOR_THICKNESS - 0.008);
  RIB_ANGLES.forEach((angle) => {
    const points = surface.map((point): Point => onAxis(point.y, point.x, angle));
    batch.add(GROUP, 'darkFrame', polyTube(points, RIB_TUBE), angle < 180 && angle > 0);
    const from = onAxis(COLLECTOR_RIM_X - RIM_FLANGE.thickness / 2, RIM_FLANGE.outer - 0.03, angle);
    const to = onAxis(STRUT_END_X, SHELL_R - 0.03, angle);
    batch.add(GROUP, 'darkFrame', bar(from, to, 0.05, 0.08), angle < 180 && angle > 0);
  });
}

function coolant(batch: Batch): void {
  COOLANT_ANGLES.forEach((angle) => {
    const from = onAxis(backX(0.5) - 0.02, 0.5, angle);
    const to = onAxis(-3.85, SHELL_R - 0.03, angle);
    batch.add(GROUP, 'copper', rod(from, to, COOLANT_RADIUS, 10));
  });
}

export function buildCollector(batch: Batch): void {
  SIDES.forEach((side) => {
    faces(batch, side);
    rimRing(batch, side);
    cooling(batch, side);
  });
  ribs(batch);
  coolant(batch);
  batch.boltRing(
    GROUP,
    [COLLECTOR_RIM_X + 0.0, AXIS_Y, 0],
    new Vector3(1, 0, 0),
    (RIM_FLANGE.inner + RIM_FLANGE.outer) / 2,
    RIM_BOLTS,
    0.016,
  );
}
