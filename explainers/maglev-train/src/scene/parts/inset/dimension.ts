import type { BufferGeometry, Mesh } from 'three';
import { merged, segment, triangle } from './strokes';
import type { Point2 } from './strokes';

export interface DimensionStyle {
  readonly line: number;
  readonly tick: number;
  readonly arrowLength: number;
  readonly arrowWidth: number;
}

const POSITION = 'position';

function offset(point: Point2, direction: Point2, distance: number): Point2 {
  return [point[0] + direction[0] * distance, point[1] + direction[1] * distance];
}

function end(tip: Point2, inward: Point2, style: DimensionStyle): BufferGeometry[] {
  const across: Point2 = [-inward[1], inward[0]];
  const base = offset(tip, inward, style.arrowLength);
  return [
    segment(offset(tip, across, -style.tick / 2), offset(tip, across, style.tick / 2), style.line),
    triangle(
      tip,
      offset(base, across, style.arrowWidth / 2),
      offset(base, across, -style.arrowWidth / 2),
    ),
  ];
}

export function dimensionGeometry(from: Point2, to: Point2, style: DimensionStyle): BufferGeometry {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
  const along: Point2 = [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
  const back: Point2 = [-along[0], -along[1]];
  return merged([
    ...end(from, along, style),
    ...end(to, back, style),
    segment(from, to, style.line),
  ]);
}

export function redrawDimension(mesh: Mesh, from: Point2, to: Point2, style: DimensionStyle): void {
  const fresh = dimensionGeometry(from, to, style);
  const positions = mesh.geometry.getAttribute(POSITION);
  positions.array.set(fresh.getAttribute(POSITION).array);
  positions.needsUpdate = true;
  fresh.dispose();
}
