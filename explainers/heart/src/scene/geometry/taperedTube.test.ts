import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { taperedTube } from './taperedTube';

describe('tapered tubes', () => {
  it('narrows from start to end and faces outward', () => {
    const points = [0, 10, 20, 30].map((y) => new Vector3(0, y, 0));
    const geometry = taperedTube({ points, radius: (share) => 3 - 2 * share, radialSegments: 8 });
    const positions = geometry.getAttribute('position').array;
    expect(Math.hypot(positions[0], positions[2])).toBeCloseTo(3, 5);
    const last = positions.length - 3;
    expect(Math.hypot(positions[last], positions[last + 2])).toBeCloseTo(1, 5);
    const index = geometry.getIndex()?.array ?? [];
    const corner = (slot: number) =>
      new Vector3(
        positions[index[slot] * 3],
        positions[index[slot] * 3 + 1],
        positions[index[slot] * 3 + 2],
      );
    const normal = corner(1)
      .sub(corner(0))
      .cross(corner(2).sub(corner(0)));
    const radial = corner(0).setY(0);
    expect(normal.dot(radial)).toBeGreaterThan(0);
  });
});
