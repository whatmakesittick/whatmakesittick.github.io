import { BufferGeometry, CircleGeometry, Float32BufferAttribute } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Box2, Point2 } from './layout';
import { row } from './layout';

const CIRCLE_SIDES = 20;
const DROPPED_ATTRIBUTES = ['normal', 'uv'] as const;

export function merged(parts: readonly BufferGeometry[]): BufferGeometry {
  const plain = parts.map((part) => {
    const flat = part.index ? part.toNonIndexed() : part;
    DROPPED_ATTRIBUTES.forEach((name) => flat.deleteAttribute(name));
    return flat;
  });
  const geometry = mergeGeometries(plain);
  new Set([...parts, ...plain]).forEach((part) => part.dispose());
  if (!geometry) throw new Error('Inset strokes need matching attributes');
  return geometry;
}

function triangles(points: readonly Point2[]): BufferGeometry {
  const geometry = new BufferGeometry();
  const positions = points.flatMap(([x, y]) => [x, y, 0]);
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return geometry;
}

export function rects(boxes: readonly Box2[]): BufferGeometry {
  return triangles(
    boxes.flatMap(([minX, minY, maxX, maxY]): Point2[] => [
      [minX, minY],
      [maxX, minY],
      [maxX, maxY],
      [minX, minY],
      [maxX, maxY],
      [minX, maxY],
    ]),
  );
}

export function outlines(boxes: readonly Box2[], width: number): BufferGeometry {
  const half = width / 2;
  return rects(
    boxes.flatMap(([minX, minY, maxX, maxY]): Box2[] => [
      row(minX - half, maxX + half, minY, width),
      row(minX - half, maxX + half, maxY, width),
      [minX - half, minY, minX + half, maxY],
      [maxX - half, minY, maxX + half, maxY],
    ]),
  );
}

export function arrowHeads(tips: readonly Point2[], length: number): BufferGeometry {
  const half = length / 2;
  return triangles(
    tips.flatMap(([x, y]): Point2[] => [
      [x - length, y - half],
      [x, y],
      [x - length, y + half],
    ]),
  );
}

export function ribbon(points: readonly Point2[], width: number): BufferGeometry {
  const edges = points.map(([x, y], index) => {
    const [ax, ay] = points[Math.max(index - 1, 0)];
    const [bx, by] = points[Math.min(index + 1, points.length - 1)];
    const scale = width / 2 / (Math.hypot(bx - ax, by - ay) || 1);
    const [nx, ny] = [-(by - ay) * scale, (bx - ax) * scale];
    return [
      [x - nx, y - ny],
      [x + nx, y + ny],
    ] as const;
  });
  return triangles(
    edges.slice(1).flatMap(([right, left], index) => {
      const [lastRight, lastLeft] = edges[index];
      return [lastRight, right, left, lastRight, left, lastLeft];
    }),
  );
}

export function discs(centres: readonly Point2[], radius: number): BufferGeometry {
  return merged(
    centres.map(([x, y]) => new CircleGeometry(radius, CIRCLE_SIDES).translate(x, y, 0)),
  );
}
