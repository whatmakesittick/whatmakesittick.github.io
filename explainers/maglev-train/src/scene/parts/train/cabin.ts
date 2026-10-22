import { Shape, ShapeGeometry, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import { CABIN } from './constants';
import { CONTOUR } from './profile';

const QUARTER_TURN = Math.PI / 2;
const CAP_CURVE_SEGMENTS = 4;

export function aheadShape(points: readonly Vector2[]): Shape {
  return new Shape(points.map((point) => new Vector2(-point.x, point.y)));
}

export function capGeometry(shapes: Shape[], x: number): BufferGeometry {
  const geometry = new ShapeGeometry(shapes, CAP_CURVE_SEGMENTS);
  geometry.rotateY(QUARTER_TURN);
  geometry.translate(x, 0, 0);
  geometry.deleteAttribute('uv');
  return geometry;
}

function contourOutline(inset: number): Vector2[] {
  const right = CONTOUR.rows.map(
    (row) => new Vector2(row.z - row.nz * inset, row.y - row.ny * inset),
  );
  const left = right
    .slice(1, -1)
    .reverse()
    .map((point) => new Vector2(-point.x, point.y));
  return [...right, ...left];
}

export function bodyOutline(): Vector2[] {
  return contourOutline(0);
}

function crossing(a: Vector2, b: Vector2, level: number): Vector2 {
  const share = (level - a.y) / (b.y - a.y);
  return new Vector2(a.x + (b.x - a.x) * share, level);
}

export function clipAbove(polygon: readonly Vector2[], level: number): Vector2[] {
  const clipped: Vector2[] = [];
  polygon.forEach((current, index) => {
    const next = polygon[(index + 1) % polygon.length];
    const inside = current.y >= level;
    if (inside) clipped.push(current);
    if (inside !== next.y >= level) clipped.push(crossing(current, next, level));
  });
  return clipped;
}

export function cabinOutline(): Vector2[] {
  return clipAbove(contourOutline(CABIN.wall), CABIN.floorY);
}

export function cabinHalfWidth(y: number): number {
  const outline = cabinOutline();
  return outline.reduce((widest, point, index) => {
    const next = outline[(index + 1) % outline.length];
    const spans = (point.y - y) * (next.y - y) <= 0 && point.y !== next.y;
    return spans ? Math.max(widest, Math.abs(crossing(point, next, y).x)) : widest;
  }, 0);
}
