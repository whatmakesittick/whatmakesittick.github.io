import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { ellipsoid } from './field';
import { papillaryFinger, wallBase } from './papillary';

describe('papillary muscles', () => {
  it('roots each muscle inside the wall behind its tip', () => {
    const cavity = ellipsoid([0, 0, 0], [20, 20, 20]);
    const base = wallBase(cavity, [0, -10, 0], [0, -1, 0], 1.5, 0.25);
    expect(base.y).toBeLessThan(-21);
    expect(base.y).toBeGreaterThan(-22.5);
  });

  it('shapes a blunt finger from the wall base to a rounded tip', () => {
    const base = new Vector3(0, 0, 0);
    const tip = new Vector3(0, 10, 0);
    const finger = papillaryFinger(base, tip, { baseRadius: 4, tipRadius: 2, segments: 10 });
    const positions = finger.getAttribute('position').array;
    let highest = Number.NEGATIVE_INFINITY;
    let widest = 0;
    for (let offset = 0; offset < positions.length; offset += 3) {
      highest = Math.max(highest, positions[offset + 1]);
      widest = Math.max(widest, Math.hypot(positions[offset], positions[offset + 2]));
    }
    expect(highest).toBeCloseTo(10, 5);
    expect(widest).toBeCloseTo(4, 5);
    expect(finger.getAttribute('uv')).toBeUndefined();
  });
});
