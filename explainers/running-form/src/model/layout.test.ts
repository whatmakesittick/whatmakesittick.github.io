import { describe, expect, it } from 'vitest';
import { REGION_IDS } from '../ids';
import { HEIGHT_M } from './body';
import {
  NEAR_STRIP_M,
  PATTERN_PERIODS_M,
  REGION_SPECS,
  SCROLL_WRAP_M,
  SHADOW_LENGTH_M,
  SUN_DIR,
} from './layout';

describe('layout', () => {
  it('points the sun behind the runner on the sea side', () => {
    expect(SUN_DIR[0]).toBeCloseTo(-0.495, 3);
    expect(SUN_DIR[1]).toBeCloseTo(0.139, 3);
    expect(SUN_DIR[2]).toBeCloseTo(-0.858, 3);
    expect(Math.hypot(...SUN_DIR)).toBeCloseTo(1, 6);
  });

  it('casts a shadow of 12.6 m forward and toward the land', () => {
    expect(SHADOW_LENGTH_M).toBeCloseTo(HEIGHT_M / Math.tan((8 * Math.PI) / 180), 6);
    expect(SHADOW_LENGTH_M).toBeCloseTo(12.6, 1);
    const horizontal = Math.hypot(SUN_DIR[0], SUN_DIR[2]);
    expect((-SUN_DIR[0] / horizontal) * SHADOW_LENGTH_M).toBeCloseTo(6.3, 1);
    expect((-SUN_DIR[2] / horizontal) * SHADOW_LENGTH_M).toBeCloseTo(10.9, 1);
  });

  it('repeats every pattern inside the strips', () => {
    Object.values(PATTERN_PERIODS_M).forEach((period) => expect(NEAR_STRIP_M % period).toBe(0));
    expect(SCROLL_WRAP_M % NEAR_STRIP_M).toBe(0);
  });

  it('has a region for every id', () => {
    REGION_IDS.forEach((id) => {
      const { x, y, z } = REGION_SPECS[id];
      [x, y, z].forEach(([min, max]) => expect(max).toBeGreaterThan(min));
    });
  });
});
