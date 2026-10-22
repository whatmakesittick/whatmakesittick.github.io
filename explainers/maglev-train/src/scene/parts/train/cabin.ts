import { Vector2 } from 'three';
import { CABIN } from './constants';
import { CONTOUR } from './profile';

export function bodyOutline(): Vector2[] {
  const right = CONTOUR.rows.map((row) => new Vector2(row.z, row.y));
  const left = right
    .slice(1, -1)
    .reverse()
    .map((point) => new Vector2(-point.x, point.y));
  return [...right, ...left];
}

function innerOutline(): Vector2[] {
  const rows = CONTOUR.rows;
  const right = rows.map(
    (row) => new Vector2(row.z - row.nz * CABIN.wall, row.y - row.ny * CABIN.wall),
  );
  const left = right
    .slice(1, -1)
    .reverse()
    .map((point) => new Vector2(-point.x, point.y));
  return [...right, ...left];
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
  return clipAbove(innerOutline(), CABIN.floorY);
}

export function cabinHalfWidth(y: number): number {
  const outline = cabinOutline();
  return outline.reduce((widest, point, index) => {
    const next = outline[(index + 1) % outline.length];
    const spans = (point.y - y) * (next.y - y) <= 0 && point.y !== next.y;
    return spans ? Math.max(widest, Math.abs(crossing(point, next, y).x)) : widest;
  }, 0);
}
