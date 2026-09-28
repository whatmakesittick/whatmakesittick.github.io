import { CylinderGeometry, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { bendEndsInward } from './bend';

function vertexAt(geometry: BufferGeometry, index: number, attribute: 'position' | 'normal') {
  return new Vector3().fromBufferAttribute(geometry.getAttribute(attribute), index);
}

function outermostTop(geometry: BufferGeometry): number {
  const position = geometry.getAttribute('position');
  let found = 0;
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    const current = vertexAt(geometry, vertex, 'position');
    if (current.y > 0.99 && current.x > vertexAt(geometry, found, 'position').x) found = vertex;
  }
  return found;
}

describe('bend ends inward', () => {
  it('pulls both ends toward minus x and leaves the middle alone', () => {
    const geometry = bendEndsInward(new CylinderGeometry(1, 1, 2, 8, 2), 1, 0.5);
    const position = geometry.getAttribute('position');
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      const point = vertexAt(geometry, vertex, 'position');
      const straight = new CylinderGeometry(1, 1, 2, 8, 2).getAttribute('position').getX(vertex);
      expect(point.x).toBeCloseTo(straight - 0.5 * point.y * point.y);
    }
  });

  it('tilts the outer normal at the top upward and keeps normals unit length', () => {
    const geometry = bendEndsInward(new CylinderGeometry(1, 1, 2, 8, 2), 1, 0.5);
    const top = outermostTop(geometry);
    expect(vertexAt(geometry, top, 'normal').y).toBeGreaterThan(0);
    const normal = geometry.getAttribute('normal');
    for (let vertex = 0; vertex < normal.count; vertex += 1) {
      expect(vertexAt(geometry, vertex, 'normal').length()).toBeCloseTo(1);
    }
  });
});
