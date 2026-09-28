import { describe, expect, it } from 'vitest';
import { ellipsoid } from './field';
import { polygonise, sampleField } from './polygonise';

const CUBE = { centre: [0, 0, 0] as const, halfSize: 16, resolution: 32 };

describe('polygonise', () => {
  it('samples the field exactly near the surface and inverts its sign', () => {
    const sphere = ellipsoid([0, 0, 0], [10, 10, 10]);
    const values = new Float32Array(CUBE.resolution ** 3);
    sampleField(sphere, CUBE, values);
    const middle = CUBE.resolution / 2;
    const index = (i: number, j: number, k: number) =>
      i + CUBE.resolution * (j + CUBE.resolution * k);
    expect(values[index(middle, middle, middle)]).toBeGreaterThan(0);
    expect(values[index(1, 1, 1)]).toBeLessThan(0);
    const nearSurface = middle + 10;
    expect(values[index(nearSurface, middle, middle)]).toBeCloseTo(0, 4);
  });

  it('builds a closed welded surface that faces outward', () => {
    const geometry = polygonise(ellipsoid([0, 0, 0], [10, 10, 10]), CUBE);
    const positions = geometry.getAttribute('position').array;
    const index = geometry.getIndex()?.array ?? [];
    for (let offset = 0; offset < positions.length; offset += 3) {
      expect(
        Math.hypot(positions[offset], positions[offset + 1], positions[offset + 2]),
      ).toBeCloseTo(10, 0);
    }
    const edges = new Map<string, number>();
    for (let t = 0; t < index.length; t += 3) {
      for (let corner = 0; corner < 3; corner += 1) {
        const a = index[t + corner];
        const b = index[t + ((corner + 1) % 3)];
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    expect([...edges.values()].every((count) => count === 2)).toBe(true);
    geometry.computeVertexNormals();
    const normals = geometry.getAttribute('normal').array;
    expect(
      positions[0] * normals[0] + positions[1] * normals[1] + positions[2] * normals[2],
    ).toBeGreaterThan(0);
  });
});
