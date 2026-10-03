import { describe, expect, it } from 'vitest';
import { poseAtDistance } from '../../model/run';
import { pathTrail, routeTrail, straightTrail, trailSpacing } from './trail';

describe('wake trails', () => {
  it('spaces samples densely near the boat', () => {
    const spacing = trailSpacing(5, 100, 2);
    expect(spacing).toEqual([0, 6.25, 25, 56.25, 100]);
  });

  it('follows the run route behind the transom and stops at the slipway', () => {
    const trail = routeTrail(poseAtDistance, 50, 2.75, [0, 10, 60]);
    expect(trail[0].x).toBeCloseTo(poseAtDistance(47.25).position[0], 6);
    expect(trail[1].x).toBeCloseTo(poseAtDistance(37.25).position[0], 6);
    expect(trail[2].live).toBe(false);
  });

  it('draws a straight trail behind a held boat', () => {
    const trail = straightTrail({ position: [10, 0, 0], heading: 0 }, 2, [0, 5]);
    expect(trail.map((sample) => sample.x)).toEqual([8, 3]);
    expect(trail.every((sample) => sample.z === 0)).toBe(true);
  });

  it('resamples a recorded path by distance', () => {
    const history = [0, 1, 2].map((step) => ({
      position: [10 - step * 4, 0, 0] as const,
      heading: 0,
    }));
    const trail = pathTrail(history, 1, [0, 3, 10]);
    expect(trail[0].x).toBeCloseTo(9, 9);
    expect(trail[1].x).toBeCloseTo(6, 9);
    expect(trail[2].live).toBe(false);
  });
});
