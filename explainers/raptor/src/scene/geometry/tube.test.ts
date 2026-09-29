import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { frameNormal, tubeAlong } from './tube';

describe('tube', () => {
  it('opens the back half of a tube that lies on the cut plane', () => {
    const tube = tubeAlong(
      [
        [0, 0, 0],
        [10, -10, 0],
        [20, -30, 0],
      ],
      { radius: 2, samples: 12, radial: 12, arc: 'back' },
    );
    const position = tube.getAttribute('position');
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      expect(position.getZ(vertex)).toBeLessThanOrEqual(1e-6);
    }
  });

  it('keeps every ring at its radius', () => {
    const tube = tubeAlong(
      [
        [0, 0, 0],
        [0, -20, 0],
      ],
      { radius: 3, samples: 4, radial: 8 },
    );
    const position = tube.getAttribute('position');
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      expect(Math.hypot(position.getX(vertex), position.getZ(vertex))).toBeCloseTo(3);
    }
  });

  it('picks a frame normal across the tangent', () => {
    const normal = frameNormal(new Vector3(0, -1, 0), new Vector3());
    expect(normal.dot(new Vector3(0, -1, 0))).toBeCloseTo(0);
    expect(frameNormal(new Vector3(0, 0, 1), new Vector3()).length()).toBeCloseTo(1);
  });
});
