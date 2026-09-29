import { IcosahedronGeometry } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { describe, expect, it } from 'vitest';
import { ellipsoid } from './field';
import { neighboursOf, snapToField, taubinSmooth } from './smooth';

function ball() {
  const raw = new IcosahedronGeometry(10, 3);
  raw.deleteAttribute('normal');
  raw.deleteAttribute('uv');
  return mergeVertices(raw);
}

describe('smoothing', () => {
  it('lists each vertex neighbour once', () => {
    const { offsets, list } = neighboursOf([0, 1, 2, 2, 1, 3], 4);
    const of = (vertex: number) => [...list.slice(offsets[vertex], offsets[vertex + 1])].sort();
    expect(of(0)).toEqual([1, 2]);
    expect(of(1)).toEqual([0, 2, 3]);
    expect(of(3)).toEqual([1, 2]);
  });

  it('evens out noise without shrinking the shape', () => {
    const geometry = ball();
    const positions = geometry.getAttribute('position').array as Float32Array;
    for (let offset = 0; offset < positions.length; offset += 3) {
      const bump = 1 + (((offset / 3) * 7919) % 13) / 300;
      positions[offset] *= bump;
      positions[offset + 1] *= bump;
      positions[offset + 2] *= bump;
    }
    const spread = () => {
      const radii = [];
      for (let offset = 0; offset < positions.length; offset += 3) {
        radii.push(Math.hypot(positions[offset], positions[offset + 1], positions[offset + 2]));
      }
      const mean = radii.reduce((sum, radius) => sum + radius, 0) / radii.length;
      const deviation =
        radii.reduce((sum, radius) => sum + Math.abs(radius - mean), 0) / radii.length;
      return { mean, deviation };
    };
    const before = spread();
    taubinSmooth(geometry);
    const after = spread();
    expect(after.deviation).toBeLessThan(before.deviation);
    expect(after.mean).toBeGreaterThan(before.mean * 0.97);
  });

  it('snaps vertices onto the field surface', () => {
    const geometry = ball();
    snapToField(geometry, ellipsoid([0, 0, 0], [12, 12, 12]));
    const positions = geometry.getAttribute('position').array;
    expect(Math.hypot(positions[0], positions[1], positions[2])).toBeCloseTo(12, 3);
  });
});
