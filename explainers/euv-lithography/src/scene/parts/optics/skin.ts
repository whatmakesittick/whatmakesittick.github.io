import type { Point } from '../../../ids';
import { BEVEL_M, PROUD_M, SEAM_M } from './dims';
import { slab } from './geo';
import type { Axis, Bin, Cell } from './geo';

const INDEX = { x: 0, y: 1, z: 2 } as const;

function across(axis: Axis): [number, number] {
  return axis === 'x' ? [1, 2] : axis === 'y' ? [0, 2] : [0, 1];
}

export function paneled(
  bin: Bin,
  axis: Axis,
  side: 1 | -1,
  min: Point,
  max: Point,
  tiles: readonly [number, number],
): void {
  bin.add('panelShade', slab(min, max));
  const [first, second] = across(axis);
  const depth = INDEX[axis];
  for (let a = 0; a < tiles[0]; a += 1) {
    for (let b = 0; b < tiles[1]; b += 1) {
      const lo: Cell = [...min];
      const hi: Cell = [...max];
      [
        [first, a, tiles[0]],
        [second, b, tiles[1]],
      ].forEach(([dimension, step, count]) => {
        const span = (max[dimension] - min[dimension]) / count;
        lo[dimension] = min[dimension] + span * step + SEAM_M / 2;
        hi[dimension] = min[dimension] + span * (step + 1) - SEAM_M / 2;
      });
      lo[depth] = side > 0 ? max[depth] : min[depth] - PROUD_M;
      hi[depth] = side > 0 ? max[depth] + PROUD_M : min[depth];
      bin.add('panel', slab(lo, hi));
    }
  }
}

const EDGE_PROUD_M = 0.008;
const LEG_FOOT_M = 0.02;
const FOOT_SPREAD = 1.4;

export function frameBeams(bin: Bin, min: Point, max: Point, beam: number, gapZ = 0): void {
  (['x', 'y', 'z'] as const).forEach((axis) => {
    const along = INDEX[axis];
    const [b, c] = across(axis);
    [0, 1].forEach((i) =>
      [0, 1].forEach((j) => {
        const gapped = axis === 'z' && gapZ > 0 && i === 1 && j === 1;
        const runs: [number, number][] = gapped
          ? [
              [min[along] - EDGE_PROUD_M, -gapZ],
              [gapZ, max[along] + EDGE_PROUD_M],
            ]
          : [[min[along] - EDGE_PROUD_M, max[along] + EDGE_PROUD_M]];
        runs.forEach(([from, to]) => {
          const lo: Cell = [0, 0, 0];
          const hi: Cell = [0, 0, 0];
          lo[along] = from;
          hi[along] = to;
          [
            [b, i],
            [c, j],
          ].forEach(([dimension, high]) => {
            lo[dimension] = high ? max[dimension] - beam : min[dimension] - EDGE_PROUD_M;
            hi[dimension] = high ? max[dimension] + EDGE_PROUD_M : min[dimension] + beam;
          });
          bin.add('frame', slab(lo, hi, BEVEL_M / 2));
        });
      }),
    );
  });
}

export function legs(
  bin: Bin,
  xs: readonly number[],
  zs: readonly number[],
  top: number,
  size: number,
): void {
  xs.forEach((x) =>
    zs.forEach((z) => {
      const half = size / 2;
      const foot = half * FOOT_SPREAD;
      bin
        .add('darkFrame', slab([x - half, LEG_FOOT_M, z - half], [x + half, top, z + half]))
        .add('frame', slab([x - foot, 0, z - foot], [x + foot, LEG_FOOT_M, z + foot]));
    }),
  );
}

type Corner = readonly [number, number];

function contains(polygon: readonly Corner[], x: number, y: number): boolean {
  return polygon.reduce((inside, [x0, y0], index) => {
    const [x1, y1] = polygon[(index + 1) % polygon.length];
    const crosses = y0 > y !== y1 > y && x < ((x1 - x0) * (y - y0)) / (y1 - y0) + x0;
    return crosses ? !inside : inside;
  }, false);
}

function span(centre: number, direction: number, beam: number): [number, number] {
  return direction > 0
    ? [centre - EDGE_PROUD_M, centre + beam]
    : [centre - beam, centre + EDGE_PROUD_M];
}

function inward(polygon: readonly Corner[], x: number, y: number): [number, number] {
  const probe = 0.01;
  const found = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ].find(([dx, dy]) => contains(polygon, x + dx * probe, y + dy * probe));
  return (found ?? [1, 1]) as [number, number];
}

export function outlineBeams(
  bin: Bin,
  polygon: readonly Corner[],
  zs: readonly [number, number],
  beam: number,
  gap: { at: Corner; z: number },
): void {
  polygon.forEach(([x0, y0], index) => {
    const [x1, y1] = polygon[(index + 1) % polygon.length];
    const [mx, my] = [(x0 + x1) / 2, (y0 + y1) / 2];
    const horizontal = y0 === y1;
    const probe = horizontal ? [0, 0.01] : [0.01, 0];
    const sign = contains(polygon, mx + probe[0], my + probe[1]) ? 1 : -1;
    zs.forEach((z, side) => {
      const [zLo, zHi] = span(z, side === 0 ? 1 : -1, beam);
      const xr: [number, number] = horizontal
        ? [Math.min(x0, x1) - EDGE_PROUD_M, Math.max(x0, x1) + EDGE_PROUD_M]
        : span(x0, sign, beam);
      const yr: [number, number] = horizontal
        ? span(y0, sign, beam)
        : [Math.min(y0, y1) - EDGE_PROUD_M, Math.max(y0, y1) + EDGE_PROUD_M];
      bin.add('frame', slab([xr[0], yr[0], zLo], [xr[1], yr[1], zHi], BEVEL_M / 2));
    });
  });
  polygon.forEach(([x, y]) => {
    const [dx, dy] = inward(polygon, x, y);
    const [xr, yr] = [span(x, dx, beam), span(y, dy, beam)];
    const gapped = x === gap.at[0] && y === gap.at[1];
    const runs: [number, number][] = gapped
      ? [
          [zs[0] - EDGE_PROUD_M, -gap.z],
          [gap.z, zs[1] + EDGE_PROUD_M],
        ]
      : [[zs[0] - EDGE_PROUD_M, zs[1] + EDGE_PROUD_M]];
    runs.forEach(([from, to]) =>
      bin.add('frame', slab([xr[0], yr[0], from], [xr[1], yr[1], to], BEVEL_M / 2)),
    );
  });
}
