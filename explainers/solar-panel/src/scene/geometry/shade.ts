import { MODULE, shadeEdgeHeight } from '../../model';
import { CELL_GAP_CM, FRAME_WALL_CM, GRID, LAMINATE } from './moduleLayout';
import type { PlanePoint } from './strip';

const SPAN = {
  x: GRID.x[1] - GRID.x[0] + CELL_GAP_CM,
  y: GRID.y[1] - GRID.y[0] + CELL_GAP_CM,
} as const;

function heightOf(fraction: number): number {
  return GRID.y[0] - CELL_GAP_CM / 2 + fraction * SPAN.y;
}

function shareOf(x: number): number {
  return (x - (GRID.x[0] - CELL_GAP_CM / 2)) / SPAN.x;
}

function clipBelow(points: readonly PlanePoint[], limit: number, keepBelow: boolean): PlanePoint[] {
  const inside = (point: PlanePoint) => (keepBelow ? point.y <= limit : point.y >= limit);
  const clipped: PlanePoint[] = [];
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    if (inside(point)) clipped.push(point);
    if (inside(point) !== inside(next)) {
      const share = (limit - point.y) / (next.y - point.y);
      clipped.push({ x: point.x + (next.x - point.x) * share, y: limit });
    }
  });
  return clipped;
}

export function shadePolygon(shade: number): PlanePoint[] {
  if (shade <= 0) return [];
  const left = -LAMINATE.width / 2;
  const right = LAMINATE.width / 2;
  const bottom = FRAME_WALL_CM;
  const top = MODULE.height - FRAME_WALL_CM;
  const raw: PlanePoint[] = [
    { x: left, y: bottom },
    { x: right, y: bottom },
    { x: right, y: heightOf(shadeEdgeHeight(shade, shareOf(right))) },
    { x: left, y: heightOf(shadeEdgeHeight(shade, shareOf(left))) },
  ];
  return clipBelow(clipBelow(raw, top, true), bottom, false);
}
