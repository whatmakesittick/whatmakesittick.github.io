import type { Point } from '../../../ids';
import { FIELD_DIRECTION, MAGNET } from '../../../model/layout';
import { FIELD_LINES } from './looks';

export type PlanePoint = readonly [radial: number, along: number];

export interface LoopSpec {
  inner: number;
  outer: number;
  halfLength: number;
  bulge: number;
}

export interface RingWave {
  travel: number;
  strength: number;
}

const FULL_TURN = 2 * Math.PI;

export function fieldLoopSpecs(): LoopSpec[] {
  return FIELD_LINES.innerRadii.map((inner, index) => ({
    inner,
    outer: MAGNET.radius + FIELD_LINES.outerClearance + index * FIELD_LINES.outerStep,
    halfLength: MAGNET.halfLength,
    bulge: FIELD_LINES.capClearance + index * FIELD_LINES.capStep,
  }));
}

function straight(radial: number, from: number, to: number): PlanePoint[] {
  const { straightSamples } = FIELD_LINES;
  return Array.from({ length: straightSamples }, (_, index) => [
    radial,
    from + ((to - from) * index) / straightSamples,
  ]);
}

function cap({ inner, outer, halfLength, bulge }: LoopSpec, end: 1 | -1): PlanePoint[] {
  const { capSamples } = FIELD_LINES;
  const middle = (inner + outer) / 2;
  const half = (outer - inner) / 2;
  return Array.from({ length: capSamples }, (_, index) => {
    const angle = (Math.PI * index) / capSamples;
    return [middle - end * half * Math.cos(angle), end * (halfLength + bulge * Math.sin(angle))];
  });
}

export function fieldLoop(spec: LoopSpec): PlanePoint[] {
  const { inner, outer, halfLength } = spec;
  return [
    ...straight(inner, -halfLength, halfLength),
    ...cap(spec, 1),
    ...straight(outer, halfLength, -halfLength),
    ...cap(spec, -1),
  ];
}

export function placeLoop(points: readonly PlanePoint[], azimuth: number, centre: Point): Point[] {
  const [dx, dy, dz] = FIELD_DIRECTION;
  const cos = Math.cos(azimuth);
  const sin = Math.sin(azimuth);
  return points.map(([radial, along]) => [
    centre[0] + radial * cos + along * dx,
    centre[1] + radial * sin + along * dy,
    centre[2] + along * dz,
  ]);
}

export function loopAzimuths(planes: number): number[] {
  return Array.from(
    { length: planes * 2 },
    (_, index) => FIELD_LINES.planeStart + (index * Math.PI) / planes,
  );
}

export function ellipseRibbon(
  side: number,
  along: number,
  segments: number,
  halfWidth: number,
): PlanePoint[] {
  return Array.from({ length: segments + 1 }, (_, index) => {
    const angle = (index / segments) * FULL_TURN;
    const x = side * Math.cos(angle);
    const z = along * Math.sin(angle);
    const nx = along * Math.cos(angle);
    const nz = side * Math.sin(angle);
    const norm = Math.hypot(nx, nz) || 1;
    const ox = (nx / norm) * halfWidth;
    const oz = (nz / norm) * halfWidth;
    return [
      [x - ox, z - oz],
      [x + ox, z + oz],
    ] as const;
  }).flat();
}

export function ringWaves(time: number, count: number): RingWave[] {
  return Array.from({ length: count }, (_, index) => {
    const shifted = time - index / count;
    const travel = shifted - Math.floor(shifted);
    return { travel, strength: Math.sin(Math.PI * travel) };
  });
}
