import { LatheGeometry, SplineCurve, Vector2 } from 'three';
import type { BufferGeometry } from 'three';

export type ProfilePoint = readonly [axial: number, radius: number];

export interface LatheArc {
  start: number;
  length: number;
}

const FULL_ARC: LatheArc = { start: 0, length: Math.PI * 2 };

export function sampleProfile(points: readonly ProfilePoint[], samples: number): Vector2[] {
  const ascending = [...points].sort((a, b) => a[0] - b[0]);
  const curve = new SplineCurve(ascending.map(([axial, radius]) => new Vector2(axial, radius)));
  return curve.getSpacedPoints(samples).map((point) => new Vector2(Math.max(0, point.y), point.x));
}

export function latheAlongX(
  profile: readonly Vector2[],
  segments: number,
  arc: LatheArc = FULL_ARC,
): BufferGeometry {
  const geometry = new LatheGeometry([...profile], segments, arc.start, arc.length);
  geometry.rotateZ(-Math.PI / 2);
  return geometry;
}
