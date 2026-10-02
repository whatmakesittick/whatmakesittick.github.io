import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { stitchRings } from './rings';
import type { Ring } from './rings';

function circle(x: number, radius: number, count: number): Ring {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return [x, radius * Math.cos(angle), radius * Math.sin(angle)] as const;
  });
}

describe('stitch rings', () => {
  it('joins the rings into a closed surface with outward normals', () => {
    const geometry = stitchRings([circle(0, 1, 12), circle(2, 1, 12)], {
      capStart: true,
      capEnd: true,
    });
    const index = geometry.getIndex();
    expect(index).not.toBeNull();
    expect((index?.count ?? 0) / 3).toBe(12 * 2 + 12 * 2);
    const normal = geometry.getAttribute('normal');
    const position = geometry.getAttribute('position');
    let outward = 0;
    for (let vertex = 0; vertex < 12; vertex += 1) {
      const n = new Vector3().fromBufferAttribute(normal, vertex);
      const p = new Vector3().fromBufferAttribute(position, vertex).setX(0);
      outward += n.dot(p.normalize());
    }
    expect(outward / 12).toBeGreaterThan(0.9);
  });

  it('refuses a single ring', () => {
    expect(() => stitchRings([circle(0, 1, 6)])).toThrow();
  });
});
