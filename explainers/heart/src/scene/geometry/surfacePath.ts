import { CatmullRomCurve3, Vector3 } from 'three';
import type { Field, Vec3 } from './field';
import { gradient } from './field';

export type SurfaceView = 'front' | 'back' | 'left' | 'right' | 'below';

export interface SurfaceMark {
  readonly view: SurfaceView;
  readonly at: readonly [number, number];
}

const FAR_MM = 200;
const HIT_MM = 0.02;
const MAX_STEPS = 256;
const SAMPLE_MM = 3;

function ray(mark: SurfaceMark): { origin: Vec3; direction: Vec3 } {
  const [a, b] = mark.at;
  switch (mark.view) {
    case 'front':
      return { origin: [a, b, FAR_MM], direction: [0, 0, -1] };
    case 'back':
      return { origin: [a, b, -FAR_MM], direction: [0, 0, 1] };
    case 'left':
      return { origin: [FAR_MM, b, a], direction: [-1, 0, 0] };
    case 'right':
      return { origin: [-FAR_MM, b, a], direction: [1, 0, 0] };
    case 'below':
      return { origin: [a, -FAR_MM, b], direction: [0, 1, 0] };
  }
}

export function castOnto(field: Field, origin: Vec3, direction: Vec3): Vec3 | null {
  let travelled = 0;
  for (let step = 0; step < MAX_STEPS; step += 1) {
    const x = origin[0] + direction[0] * travelled;
    const y = origin[1] + direction[1] * travelled;
    const z = origin[2] + direction[2] * travelled;
    const distance = field.distance(x, y, z);
    if (distance < HIT_MM) return [x, y, z];
    travelled += distance;
    if (travelled > FAR_MM * 2) return null;
  }
  return null;
}

export function surfacePoint(field: Field, mark: SurfaceMark): Vec3 {
  const { origin, direction } = ray(mark);
  const hit = castOnto(field, origin, direction);
  if (!hit) throw new Error(`No surface under ${mark.view} ${mark.at.join(',')}`);
  return hit;
}

export function surfaceCurve(field: Field, marks: readonly SurfaceMark[]): CatmullRomCurve3 {
  return new CatmullRomCurve3(
    marks.map((mark) => new Vector3(...surfacePoint(field, mark))),
    false,
    'centripetal',
  );
}

export function hugSurface(
  field: Field,
  curve: CatmullRomCurve3,
  lift: (share: number) => number,
): Vector3[] {
  const count = Math.max(2, Math.ceil(curve.getLength() / SAMPLE_MM));
  return curve.getSpacedPoints(count).map((point, index) => {
    let current: Vec3 = [point.x, point.y, point.z];
    for (let pass = 0; pass < 2; pass += 1) {
      const distance = field.distance(...current);
      const normal = gradient(field, ...current);
      current = [
        current[0] - normal[0] * distance,
        current[1] - normal[1] * distance,
        current[2] - normal[2] * distance,
      ];
    }
    const normal = gradient(field, ...current);
    const offset = lift(index / count);
    return new Vector3(
      current[0] + normal[0] * offset,
      current[1] + normal[1] * offset,
      current[2] + normal[2] * offset,
    );
  });
}
