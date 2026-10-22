import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments } from 'three';
import type { LineBasicMaterialParameters } from 'three';
import { registeredMaterial } from '../../../context';
import type { EmphasisGroup, PartContext } from '../../../context';

export type Point3 = readonly [number, number, number];

const XYZ = 3;

export function polyline(points: readonly Point3[], closed = false): number[] {
  const count = closed ? points.length : points.length - 1;
  return Array.from({ length: count }, (_, index) => [
    ...points[index],
    ...points[(index + 1) % points.length],
  ]).flat();
}

export function lineSegments(
  context: PartContext,
  group: EmphasisGroup,
  positions: readonly number[],
  look: LineBasicMaterialParameters,
): LineSegments {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, XYZ));
  const material = new LineBasicMaterial({ transparent: true, ...look });
  return new LineSegments(
    context.tracker.track(geometry),
    registeredMaterial(context, group, material),
  );
}
