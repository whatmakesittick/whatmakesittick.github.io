import type { BufferGeometry } from 'three';
import type { Field } from './field';
import { insertLevel, subsetGeometry } from './planeCut';

const XYZ = 3;
const CORNERS = 3;
const TOUCHING_MM = 1e-4;
const BISECTIONS = 12;

function fieldValues(geometry: BufferGeometry, field: Field): Float32Array {
  const positions = geometry.getAttribute('position').array;
  const count = positions.length / XYZ;
  const values = new Float32Array(count);
  for (let vertex = 0; vertex < count; vertex += 1) {
    const offset = vertex * XYZ;
    const value = field.distance(positions[offset], positions[offset + 1], positions[offset + 2]);
    values[vertex] = Math.abs(value) < TOUCHING_MM ? 0 : value;
  }
  return values;
}

function crossingLocator(geometry: BufferGeometry, field: Field) {
  const positions = geometry.getAttribute('position').array;
  const at = (from: number, to: number, share: number): number => {
    const a = from * XYZ;
    const b = to * XYZ;
    return field.distance(
      positions[a] + (positions[b] - positions[a]) * share,
      positions[a + 1] + (positions[b + 1] - positions[a + 1]) * share,
      positions[a + 2] + (positions[b + 2] - positions[a + 2]) * share,
    );
  };
  return (from: number, to: number): number => {
    let low = 0;
    let high = 1;
    const startSign = Math.sign(at(from, to, 0));
    for (let step = 0; step < BISECTIONS; step += 1) {
      const middle = (low + high) / 2;
      if (Math.sign(at(from, to, middle)) === startSign) low = middle;
      else high = middle;
    }
    return (low + high) / 2;
  };
}

export function carveInside(geometry: BufferGeometry, field: Field): BufferGeometry {
  const split = insertLevel(
    geometry,
    fieldValues(geometry, field),
    crossingLocator(geometry, field),
  );
  const values = fieldValues(split, field);
  const kept = subsetGeometry(split, (corners) => {
    let sum = 0;
    for (const vertex of corners) sum += values[vertex];
    return sum / CORNERS >= 0;
  });
  split.dispose();
  return kept;
}
