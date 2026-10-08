import type { BufferGeometry } from 'three';
import { lerp } from '@core/math';
import type { Point } from '../../../ids';
import { mergeParts, strut } from './geometry';

const LEVELS = [0, 7, 13.5, 20, 25, 30, 35] as const;
const WAIST_LEVEL = 3;
const BASE_HALF_M = 3.6;
const WAIST_HALF_M = 1.3;
const TOP_HALF_M = 0.8;
const SINK_M = 1;
const LEG_M = 0.5;
const BRACE_M = 0.22;
const ARM_RISE_M = 2.4;
const INSULATOR_M = 2.4;
const INSULATOR_THICKNESS_M = 0.32;
const PEAK_M = 2;
const ARMS = [
  { level: 3, reach: 6 },
  { level: 4, reach: 7.5 },
  { level: 5, reach: 5.5 },
] as const;
const CORNERS = [
  [1, 1],
  [1, -1],
  [-1, -1],
  [-1, 1],
] as const;

export const PYLON_TOP_M = LEVELS[LEVELS.length - 1] + PEAK_M;

function halfWidth(level: number): number {
  if (level <= WAIST_LEVEL) return lerp(BASE_HALF_M, WAIST_HALF_M, level / WAIST_LEVEL);
  return lerp(WAIST_HALF_M, TOP_HALF_M, (level - WAIST_LEVEL) / (LEVELS.length - 1 - WAIST_LEVEL));
}

function corner(level: number, [signX, signZ]: readonly [number, number]): Point {
  const half = halfWidth(level);
  const y = level === 0 ? -SINK_M : LEVELS[level];
  return [signX * half, y, signZ * half];
}

function body(): BufferGeometry[] {
  return LEVELS.slice(1).flatMap((_, below) => {
    const above = below + 1;
    return CORNERS.flatMap((signs, index) => {
      const next = CORNERS[(index + 1) % CORNERS.length];
      return [
        strut(corner(below, signs), corner(above, signs), LEG_M),
        strut(corner(above, signs), corner(above, next), BRACE_M),
        strut(corner(below, signs), corner(above, next), BRACE_M),
        strut(corner(below, next), corner(above, signs), BRACE_M),
      ];
    });
  });
}

export const EARTH_WIRE: Point = [0, PYLON_TOP_M, 0];

export function phaseAttachments(): Point[] {
  return ARMS.flatMap(({ level, reach }) =>
    [-1, 1].map((side): Point => [0, LEVELS[level] - INSULATOR_M, side * reach]),
  ).sort((a, b) => a[2] - b[2]);
}

function arms(): BufferGeometry[] {
  return ARMS.flatMap(({ level, reach }) => {
    const y = LEVELS[level];
    const half = halfWidth(level);
    return [-1, 1].flatMap((side) => [
      strut([0, y, side * half], [0, y, side * reach], LEG_M),
      strut([0, y + ARM_RISE_M, side * half], [0, y, side * reach], BRACE_M),
      strut([0, y, side * reach], [0, y - INSULATOR_M, side * reach], INSULATOR_THICKNESS_M),
    ]);
  });
}

export function pylonGeometry(): BufferGeometry {
  const top = LEVELS.length - 1;
  const peak = strut([0, LEVELS[top], 0], [0, PYLON_TOP_M, 0], LEG_M);
  return mergeParts([...body(), ...arms(), peak]);
}
