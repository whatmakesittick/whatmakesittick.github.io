import { IcosahedronGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { addMorphTargets, addPickedMorphTargets } from './morph';

describe('morph targets', () => {
  it('stores relative offsets and the normals of the moved surface', () => {
    const geometry = new IcosahedronGeometry(10, 1);
    addMorphTargets(geometry, [
      (x, _y, _z, out) => {
        out[0] = x;
        out[1] = 0;
        out[2] = 0;
        return out;
      },
    ]);
    expect(geometry.morphTargetsRelative).toBe(true);
    const offsets = geometry.morphAttributes.position?.[0].array ?? [];
    const positions = geometry.getAttribute('position').array;
    expect(offsets[0]).toBeCloseTo(positions[0], 5);
    expect(geometry.morphAttributes.normal?.[0].count).toBe(
      geometry.getAttribute('position').count,
    );
  });

  it('can pick a field per vertex and keep flat normals', () => {
    const geometry = new IcosahedronGeometry(10, 0);
    const lift = (_x: number, _y: number, _z: number, out: [number, number, number]) => {
      out[0] = 0;
      out[1] = 1;
      out[2] = 0;
      return out;
    };
    const still = (_x: number, _y: number, _z: number, out: [number, number, number]) => {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      return out;
    };
    addPickedMorphTargets(geometry, [(vertex) => (vertex === 0 ? lift : still)], {
      flatNormals: true,
    });
    const offsets = geometry.morphAttributes.position?.[0].array ?? [];
    expect(offsets[1]).toBe(1);
    expect(offsets[4]).toBe(0);
    expect(
      [...(geometry.morphAttributes.normal?.[0].array ?? [])].every((value) => value === 0),
    ).toBe(true);
  });
});
