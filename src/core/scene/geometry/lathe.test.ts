import { describe, expect, it } from 'vitest';
import { sampleProfile } from './lathe';
import type { ProfilePoint } from './lathe';

const SAMPLES = 8;

describe('sampleProfile', () => {
  it('samples the profile along the axis in ascending order', () => {
    const points: ProfilePoint[] = [
      [2, 0.5],
      [0, 0.2],
      [1, 0.8],
    ];
    const profile = sampleProfile(points, SAMPLES);
    const axial = profile.map((point) => point.y);
    expect(profile).toHaveLength(SAMPLES + 1);
    expect(axial[0]).toBeCloseTo(0);
    expect(axial[SAMPLES]).toBeCloseTo(2);
    expect(axial).toEqual([...axial].sort((a, b) => a - b));
  });

  it('passes through the profile points as radius and axial position', () => {
    const profile = sampleProfile(
      [
        [0, 0.2],
        [2, 0.5],
      ],
      SAMPLES,
    );
    expect(profile[0].x).toBeCloseTo(0.2);
    expect(profile[SAMPLES].x).toBeCloseTo(0.5);
  });

  it('never returns a negative radius', () => {
    const profile = sampleProfile(
      [
        [0, 0],
        [1, -1],
        [2, 0],
      ],
      SAMPLES,
    );
    const radii = profile.map((point) => point.x);
    expect(Math.min(...radii)).toBe(0);
    expect(radii.every((radius) => radius >= 0)).toBe(true);
  });
});
