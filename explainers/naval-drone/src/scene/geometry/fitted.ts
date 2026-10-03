import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { mergeParts } from '../parts/context';
import { spread } from './curves';
import { flatPolygon } from './flat';
import { bottomYAt } from './hullLines';
import type { Pair } from './hullLines';
import { gridSurface, orientFrom } from './surface';
import type { Vec3 } from './surface';

export interface FittedBox {
  x: readonly [number, number];
  z: (x: number) => readonly [number, number];
  y: readonly [number, number];
  clearance: number;
}

const FLOOR_SAMPLES = 10;
const OUTLINE_POINTS = 44;
const ROUNDING_PASSES = 2;
const CHAIKIN = 0.25;

export function fittedOutline(box: FittedBox, x: number): Pair[] {
  const [zMin, zMax] = box.z(x);
  const [yMin, yMax] = box.y;
  const floor = (z: number) => Math.max(yMin, bottomYAt(x, z) + box.clearance);
  const bottom = spread(zMin, zMax, FLOOR_SAMPLES);
  if (zMin < 0 && zMax > 0) bottom.push(0);
  bottom.sort((a, b) => a - b);
  return [[zMax, yMax], [zMin, yMax], ...bottom.map((z): Pair => [z, Math.min(floor(z), yMax)])];
}

function chaikin(points: readonly Pair[]): Pair[] {
  return points.flatMap((point, index) => {
    const next = points[(index + 1) % points.length];
    return [
      [point[0] + (next[0] - point[0]) * CHAIKIN, point[1] + (next[1] - point[1]) * CHAIKIN],
      [
        point[0] + (next[0] - point[0]) * (1 - CHAIKIN),
        point[1] + (next[1] - point[1]) * (1 - CHAIKIN),
      ],
    ] as Pair[];
  });
}

export function resample(loop: readonly Pair[], count: number): Pair[] {
  const closed = [...loop, loop[0]];
  const lengths = [0];
  for (let index = 1; index < closed.length; index += 1) {
    const [a, b] = [closed[index - 1], closed[index]];
    lengths.push(lengths[index - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = lengths[lengths.length - 1];
  return Array.from({ length: count }, (_, index) => {
    const target = (index / count) * total;
    let at = 1;
    while (at < lengths.length - 1 && lengths[at] < target) at += 1;
    const share = (target - lengths[at - 1]) / Math.max(lengths[at] - lengths[at - 1], 1e-9);
    const [a, b] = [closed[at - 1], closed[at]];
    return [a[0] + (b[0] - a[0]) * share, a[1] + (b[1] - a[1]) * share];
  });
}

export function roundedOutline(box: FittedBox, x: number, rounded = true): Pair[] {
  let loop = fittedOutline(box, x);
  if (rounded) for (let pass = 0; pass < ROUNDING_PASSES; pass += 1) loop = chaikin(loop);
  return resample(loop, OUTLINE_POINTS);
}

export function fittedSolid(box: FittedBox, samples: number, rounded = true): BufferGeometry {
  const xs = spread(box.x[0], box.x[1], samples);
  const loops = xs.map((x) => roundedOutline(box, x, rounded));
  const rows = loops[0].map((_, index) =>
    xs.map((x, column): Vec3 => [x, loops[column][index][1], loops[column][index][0]]),
  );
  rows.push(rows[0]);
  const centre: Vec3 = [(box.x[0] + box.x[1]) / 2, (box.y[0] + box.y[1]) / 2, 0];
  const cap = (column: number) => flatPolygon(loops[column], (z, y) => [xs[column], y, z]);
  return mergeParts(
    [gridSurface(rows), cap(0), cap(xs.length - 1)].map((part) => orientFrom(part, centre)),
  );
}

export function tubeAlong(points: readonly Vec3[], radius: number, segments = 8): BufferGeometry {
  const curve = new CatmullRomCurve3(points.map((point) => new Vector3(...point)));
  return new TubeGeometry(curve, Math.max(points.length * 6, 12), radius, segments, false);
}
