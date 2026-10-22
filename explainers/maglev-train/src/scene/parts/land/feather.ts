import { BufferGeometry, DoubleSide, Float32BufferAttribute } from 'three';
import type { MeshBasicMaterial } from 'three';
import type { PartContext } from '../context';
import { DECAL_LAYER, overlayMaterial } from './overlay';
import type { GroundPoint } from './shadow';

const RGBA = 4;

export function clipBelow(points: readonly GroundPoint[], minZ: number): GroundPoint[] {
  const clipped: GroundPoint[] = [];
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    const inside = point[1] >= minZ;
    if (inside) clipped.push(point);
    if (inside !== next[1] >= minZ) {
      const share = (minZ - point[1]) / (next[1] - point[1]);
      clipped.push([point[0] + (next[0] - point[0]) * share, minZ]);
    }
  });
  return clipped;
}

function outward(points: readonly GroundPoint[], index: number, sign: number): GroundPoint {
  const previous = points[(index + points.length - 1) % points.length];
  const point = points[index];
  const next = points[(index + 1) % points.length];
  const edge = (a: GroundPoint, b: GroundPoint): GroundPoint => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [((b[1] - a[1]) / length) * sign, (-(b[0] - a[0]) / length) * sign];
  };
  const [ax, az] = edge(previous, point);
  const [bx, bz] = edge(point, next);
  const length = Math.hypot(ax + bx, az + bz) || 1;
  return [(ax + bx) / length, (az + bz) / length];
}

function signedArea(points: readonly GroundPoint[]): number {
  return points.reduce((sum, [x, z], index) => {
    const [nextX, nextZ] = points[(index + 1) % points.length];
    return sum + x * nextZ - nextX * z;
  }, 0);
}

export function featherGeometry(
  points: readonly GroundPoint[],
  feather: number,
  y: number,
): BufferGeometry {
  const sign = signedArea(points) > 0 ? 1 : -1;
  const count = points.length;
  const positions: number[] = [];
  const colours: number[] = [];
  const centre = points.reduce<[number, number]>(
    ([sx, sz], [x, z]) => [sx + x / count, sz + z / count],
    [0, 0],
  );
  const push = ([x, z]: GroundPoint, alpha: number) => {
    positions.push(x, y, z);
    colours.push(1, 1, 1, alpha);
  };
  push(centre, 1);
  points.forEach((point, index) => {
    const [nx, nz] = outward(points, index, sign);
    push([point[0] - nx * feather, point[1] - nz * feather], 1);
    push([point[0] + nx * feather, point[1] + nz * feather], 0);
  });
  const indices: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const inner = 1 + index * 2;
    const nextInner = 1 + ((index + 1) % count) * 2;
    indices.push(0, inner, nextInner);
    indices.push(inner, inner + 1, nextInner + 1, inner, nextInner + 1, nextInner);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colours, RGBA));
  geometry.setIndex(indices);
  return geometry;
}

export const FEATHER_SHADE = { colour: '#1f2633', opacity: 0.5, lift: 0.1 } as const;

export function featherShadowMaterial(context: PartContext): MeshBasicMaterial {
  return overlayMaterial(context, {
    color: FEATHER_SHADE.colour,
    vertexColors: true,
    opacity: FEATHER_SHADE.opacity,
    side: DoubleSide,
    ...DECAL_LAYER,
  });
}
