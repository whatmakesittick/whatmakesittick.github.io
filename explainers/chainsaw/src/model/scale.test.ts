import { describe, expect, it } from 'vitest';
import { REGION_IDS } from '../ids';
import { BAR_CM } from './constants';
import { NOSE_X, NOSE_RADIUS } from './chain';
import { REGION_BOUNDS, SAW_GEOMETRY, SETTING_LAYOUT, rotateAboutZ, sweptBounds } from './scale';

describe('scale', () => {
  it('gives every region a box with positive size', () => {
    REGION_IDS.forEach((id) => {
      const { min, max } = REGION_BOUNDS[id];
      [0, 1, 2].forEach((axis) => expect(max[axis]).toBeGreaterThan(min[axis]));
    });
  });

  it('leaves about 40 cm of bar beyond the housing', () => {
    const cutting = NOSE_X + NOSE_RADIUS - SAW_GEOMETRY.powerhead.max[0];
    expect(cutting * 100).toBeCloseTo(BAR_CM, 0);
  });

  it('lifts the nose up and back in a positive rise', () => {
    const nose = rotateAboutZ([0.46, 0.1, 0], SAW_GEOMETRY.rearGrip, 30);
    expect(nose[1]).toBeGreaterThan(0.1);
    expect(nose[0]).toBeLessThan(0.46);
  });

  it('keeps the whole kickback rise inside its region', () => {
    const swept = sweptBounds(REGION_BOUNDS.bar, SAW_GEOMETRY.rearGrip, 35);
    const region = REGION_BOUNDS.kickback;
    [0, 1].forEach((axis) => {
      expect(swept.min[axis]).toBeGreaterThanOrEqual(region.min[axis]);
      expect(swept.max[axis]).toBeLessThanOrEqual(region.max[axis]);
    });
  });

  it('puts a log under the bar only in the cutting and kickback settings', () => {
    expect(SETTING_LAYOUT.bench.log).toBeNull();
    expect(SETTING_LAYOUT.cutting.log).not.toBeNull();
    expect(SETTING_LAYOUT.kickback.log).not.toBeNull();
  });
});
