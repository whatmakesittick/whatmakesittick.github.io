import { describe, expect, it } from 'vitest';
import { BoxGeometry } from 'three';
import { splitAtCut } from './cut';
import { facing, triangles, zRange } from './testing';

describe('splitAtCut', () => {
  const box = new BoxGeometry(6, 4, 4);
  const { half, face } = splitAtCut(box);

  it('keeps nothing beyond the cut plane', () => {
    expect(zRange(half)[1]).toBeLessThanOrEqual(0);
    expect(zRange(half)[0]).toBeCloseTo(-2);
  });

  it('flattens the removed side into a face that looks along plus z', () => {
    expect(face).not.toBeNull();
    const faceTriangles = face ? triangles(face) : [];
    const total = faceTriangles.reduce((sum, triangle) => sum + facing(triangle).z, 0);
    expect(total).toBeCloseTo(6 * 4);
    for (const triangle of faceTriangles) {
      expect(triangle.every((corner) => corner.z === 0)).toBe(true);
      expect(facing(triangle).z).toBeGreaterThan(0);
    }
  });
});
