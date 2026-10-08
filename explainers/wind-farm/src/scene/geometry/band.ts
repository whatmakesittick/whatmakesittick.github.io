import { LatheGeometry, Vector2 } from 'three';
import type { BufferGeometry } from 'three';

export interface Band {
  inner: number;
  outer: number;
  bottom: number;
  top: number;
}

export function bandGeometry(band: Band, segments: number): BufferGeometry {
  const { inner, outer, bottom, top } = band;
  const corners = [
    new Vector2(inner, bottom),
    new Vector2(outer, bottom),
    new Vector2(outer, top),
    new Vector2(inner, top),
  ];
  const crisp = corners.flatMap((corner) => [corner, corner.clone()]);
  return new LatheGeometry([...crisp, corners[0].clone()], segments);
}

export function crispProfile(points: readonly (readonly [radius: number, y: number])[]): Vector2[] {
  return points.flatMap(([radius, y], index) => {
    const point = new Vector2(radius, y);
    const isEnd = index === 0 || index === points.length - 1;
    return isEnd ? [point] : [point, point.clone()];
  });
}
