import { CylinderGeometry } from 'three';
import type { BufferGeometry } from 'three';
import type { Point } from '../../../ids';
import type { Finish } from '../../finishes';
import { joined, ring, rod } from './geo';

export const FACE_THICKNESS = 0.05;
export const BACK_Y = -(FACE_THICKNESS + 0.34);
const CELL_Y = -(FACE_THICKNESS + 0.07);
const CELL_INNER = 0.46;
const CELL_OUTER = 0.58;
const CELL_THICKNESS = 0.12;
const FLANGE_Y = CELL_Y - CELL_THICKNESS / 2;
const STRUTS = 3;
const STRUT_RADIUS = 0.028;
const STRUT_RING_RADIUS = 0.5;
const STRUT_PLATE_RADIUS = 0.4;
const KNUCKLE_RADIUS = 0.055;
const KNUCKLE_HEIGHT = 0.05;
const BACK_THICKNESS = 0.06;
const BACK_RADIUS = 0.55;
const BOSS_RADIUS = 0.12;
const BOSS_DEPTH = 0.06;
const CYLINDER_SIDES = 28;

function strutAt(index: number): { from: Point; to: Point } {
  const angle = (index / STRUTS) * Math.PI * 2;
  const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
  return {
    from: [cos * STRUT_RING_RADIUS, FLANGE_Y, sin * STRUT_RING_RADIUS],
    to: [cos * STRUT_PLATE_RADIUS, BACK_Y, sin * STRUT_PLATE_RADIUS],
  };
}

function knuckle([x, y, z]: Point): BufferGeometry {
  return new CylinderGeometry(
    KNUCKLE_RADIUS,
    KNUCKLE_RADIUS,
    KNUCKLE_HEIGHT,
    CYLINDER_SIDES / 2,
  ).translate(x, y, z);
}

function cylinder(radius: number, height: number, y: number): BufferGeometry {
  return new CylinderGeometry(radius, radius, height, CYLINDER_SIDES).translate(0, y, 0);
}

function struts(): BufferGeometry[] {
  return Array.from({ length: STRUTS }, (_, index) => strutAt(index)).map(({ from, to }) =>
    rod(from, to, STRUT_RADIUS),
  );
}

function knuckles(): BufferGeometry[] {
  return Array.from({ length: STRUTS }, (_, index) => strutAt(index)).flatMap(({ from, to }) => [
    knuckle(from),
    knuckle(to),
  ]);
}

function machinedMount(): BufferGeometry {
  return joined([
    ring('y', [0, CELL_Y, 0], CELL_INNER, CELL_OUTER, CELL_THICKNESS),
    cylinder(BACK_RADIUS, BACK_THICKNESS, BACK_Y),
    ...struts(),
  ]);
}

function boss(): BufferGeometry {
  return cylinder(BOSS_RADIUS, BOSS_DEPTH, BACK_Y - (BACK_THICKNESS + BOSS_DEPTH) / 2);
}

export const MOUNT_PIECES: readonly (readonly [Finish, () => BufferGeometry])[] = [
  ['machined', machinedMount],
  ['flange', () => joined(knuckles())],
  ['darkFrame', boss],
];
