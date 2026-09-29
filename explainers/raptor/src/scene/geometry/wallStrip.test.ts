import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { wallRadius } from '../../model';
import { wallStrip } from './wallStrip';

describe('wall strip', () => {
  it('lays the cut face of the wall on both sides facing the viewer', () => {
    const strip = wallStrip({ inner: 0, outer: 1, from: -100, to: -300, samples: 8, z: -0.4 });
    const position = strip.getAttribute('position');
    const index = strip.getIndex();
    if (!index) throw new Error('Expected an indexed strip');
    for (let face = 0; face < index.count / 3; face += 1) {
      const [a, b, c] = [0, 1, 2].map((corner) =>
        new Vector3().fromBufferAttribute(position, index.getX(face * 3 + corner)),
      );
      expect(b.sub(a).cross(c.sub(a)).z).toBeGreaterThan(0);
    }
    expect(Math.abs(position.getX(0))).toBeCloseTo(wallRadius(-100));
    expect(position.getZ(0)).toBeCloseTo(-0.4);
  });
});
