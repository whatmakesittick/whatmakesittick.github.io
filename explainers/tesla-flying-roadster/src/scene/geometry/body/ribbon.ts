import type { BufferGeometry } from 'three';
import { lerp } from '@core/math';
import { add, cross, MeshBuilder, normalize, scale, sub } from './mesh';
import type { BodySurface, SurfaceSpot } from './surface';

export interface RibbonSpec {
  path: readonly SurfaceSpot[];
  width: number;
  lift: number;
  closed?: boolean;
}

export interface Corner {
  at: SurfaceSpot;
  round: number;
}

const CORNER_STEPS = 6;

export function stationLine(x: number, from: number, to: number, steps: number): SurfaceSpot[] {
  return Array.from({ length: steps + 1 }, (_, step) => [x, lerp(from, to, step / steps)] as const);
}

export function rowLine(s: number, from: number, to: number, steps: number): SurfaceSpot[] {
  return Array.from({ length: steps + 1 }, (_, step) => [lerp(from, to, step / steps), s] as const);
}

function toward(from: SurfaceSpot, to: SurfaceSpot, share: number): SurfaceSpot {
  return [lerp(from[0], to[0], share), lerp(from[1], to[1], share)];
}

function bend(before: SurfaceSpot, corner: SurfaceSpot, after: SurfaceSpot): SurfaceSpot[] {
  return Array.from({ length: CORNER_STEPS + 1 }, (_, step) => {
    const t = step / CORNER_STEPS;
    const first = toward(before, corner, t);
    const second = toward(corner, after, t);
    return toward(first, second, t);
  });
}

export function roundedPath(
  corners: readonly Corner[],
  closed: boolean,
  steps: number,
): SurfaceSpot[] {
  const count = corners.length;
  const points: SurfaceSpot[] = [];
  corners.forEach(({ at, round }, index) => {
    const isEnd = !closed && (index === 0 || index === count - 1);
    if (isEnd) {
      points.push(at);
      return;
    }
    const previous = corners[(index - 1 + count) % count].at;
    const next = corners[(index + 1) % count].at;
    points.push(...bend(toward(at, previous, round), at, toward(at, next, round)));
  });
  return closed ? points : densify(points, steps);
}

function densify(points: readonly SurfaceSpot[], steps: number): SurfaceSpot[] {
  return points.flatMap((point, index) => {
    if (index === points.length - 1) return [point];
    const next = points[index + 1];
    return Array.from({ length: steps }, (_, step) => toward(point, next, step / steps));
  });
}

export function surfaceRibbon(surface: BodySurface, spec: RibbonSpec, mirror = 1): BufferGeometry {
  const { path, width, lift, closed = false } = spec;
  const builder = new MeshBuilder();
  const count = path.length;
  const pick = (index: number) =>
    path[closed ? (index + count) % count : Math.min(count - 1, Math.max(0, index))];
  const pairs = path.map(([x, s], index) => {
    const centre = surface.point(x, s, mirror);
    const normal = surface.normal(x, s, mirror);
    const [ahead, behind] = [pick(index + 1), pick(index - 1)];
    const tangent = sub(
      surface.point(ahead[0], ahead[1], mirror),
      surface.point(behind[0], behind[1], mirror),
    );
    const across = scale(normalize(cross(normal, tangent)), width / 2);
    const raised = add(centre, scale(normal, lift));
    return [
      builder.vertex(add(raised, across), normal),
      builder.vertex(sub(raised, across), normal),
    ];
  });
  const segments = closed ? count : count - 1;
  for (let index = 0; index < segments; index += 1) {
    const [a, b] = pairs[index];
    const [c, d] = pairs[(index + 1) % count];
    builder.quad(a, b, d, c);
  }
  return builder.build();
}
