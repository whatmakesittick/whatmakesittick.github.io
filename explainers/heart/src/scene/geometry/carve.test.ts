import { IcosahedronGeometry } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { describe, expect, it } from 'vitest';
import { carveInside } from './carve';
import { capsule } from './field';
import { openLoops } from './planeCut';

describe('carving a mesh by a field', () => {
  it('removes the part of a surface inside another shape and leaves a clean hole', () => {
    const raw = new IcosahedronGeometry(10, 3);
    raw.deleteAttribute('normal');
    raw.deleteAttribute('uv');
    const ball = mergeVertices(raw);
    const drill = capsule([0, 0, 0], [0, 20, 0], 4);
    const carved = carveInside(ball, drill);
    const positions = carved.getAttribute('position').array;
    for (let offset = 0; offset < positions.length; offset += 3) {
      expect(
        drill.distance(positions[offset], positions[offset + 1], positions[offset + 2]),
      ).toBeGreaterThan(-0.05);
    }
    const loops = openLoops(carved);
    expect(loops).toHaveLength(1);
    for (const vertex of loops[0]) {
      const radius = Math.hypot(positions[vertex * 3], positions[vertex * 3 + 2]);
      expect(radius).toBeCloseTo(4, 0);
    }
  });
});
