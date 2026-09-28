import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { RibbonGeometry, lateralNormals, spiralRibbon } from './ribbon';

describe('ribbon', () => {
  it('builds lateral normals perpendicular to the path', () => {
    const path = new Float32Array([0, 0, 1, 0, 2, 0]);
    const normals = new Float32Array(6);
    lateralNormals(path, normals);
    expect(normals[0]).toBeCloseTo(0);
    expect(normals[1]).toBeCloseTo(1);
  });

  it('winds every face toward its vertex normal', () => {
    const geometry = spiralRibbon(1, 2, 2, 0.5, 0.1, 16);
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const index = geometry.index;
    if (!index) throw new Error('Ribbon must be indexed');
    const [a, b, c, n] = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
    for (let face = 0; face < index.count; face += 3) {
      a.fromBufferAttribute(position, index.getX(face));
      b.fromBufferAttribute(position, index.getX(face + 1));
      c.fromBufferAttribute(position, index.getX(face + 2));
      n.fromBufferAttribute(normal, index.getX(face));
      const facing = b.sub(a).cross(c.sub(a));
      expect(facing.dot(n)).toBeGreaterThan(0);
    }
  });

  it('keeps its buffers when rewritten with the same sample counts', () => {
    const segments = [{ fromRadius: 1, toRadius: 2, fromAngle: 0, sweep: 6, samples: 30 }];
    const ribbon = new RibbonGeometry(segments);
    const buffer = ribbon.geometry.getAttribute('position').array;
    ribbon.write([{ ...segments[0], sweep: 7 }], { halfWidth: 0.05, bottom: 0, top: 1 });
    expect(ribbon.geometry.getAttribute('position').array).toBe(buffer);
    expect(ribbon.triangleCount).toBe(
      ribbon.geometry.index?.count ? ribbon.geometry.index.count / 3 : 0,
    );
  });
});
