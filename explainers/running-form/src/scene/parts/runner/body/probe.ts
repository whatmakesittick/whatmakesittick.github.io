import { Vector3 } from 'three';
import type { Figure } from '@core/figure';

const AXES = 3;

export function regionOf(figure: Figure, centre: Vector3, radius: number): Figure {
  const indices: number[] = [];
  const corner = new Vector3();
  for (let t = 0; t < figure.triangleCount; t++) {
    const near = [0, 1, 2].some(
      (k) =>
        corner
          .fromArray(figure.restPositions, figure.indices[t * AXES + k] * AXES)
          .distanceTo(centre) < radius,
    );
    if (near) indices.push(...[0, 1, 2].map((k) => figure.indices[t * AXES + k]));
  }
  return Object.create(figure, {
    indices: { value: Uint16Array.from(indices) },
    triangleCount: { value: indices.length / AXES },
  }) as Figure;
}
