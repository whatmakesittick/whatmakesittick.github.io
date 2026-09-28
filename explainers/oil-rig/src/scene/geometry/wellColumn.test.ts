import { describe, expect, it } from 'vitest';
import { tubularRadius } from '../../model/scale';
import { SECTIONS, SEABED_DEPTH_M, TOTAL_DEPTH_M } from '../../model/wellPlan';
import {
  annulusWall,
  casingInner,
  holeAt,
  holeIntervals,
  lastSetCasing,
  slotHalfWidth,
  wellY,
} from './wellColumn';

describe('well column', () => {
  it('starts the first hole section at the seabed and chains the rest by shoe', () => {
    const intervals = holeIntervals();
    expect(intervals[0].top).toBe(SEABED_DEPTH_M);
    intervals.slice(1).forEach((interval, index) => {
      expect(interval.top).toBe(SECTIONS[index].shoeDepth);
    });
    expect(intervals[intervals.length - 1].bottom).toBe(TOTAL_DEPTH_M);
  });

  it('cuts the slot as wide as the widest hole', () => {
    const widest = Math.max(...SECTIONS.map((section) => section.holeInches));
    expect(slotHalfWidth()).toBeCloseTo(tubularRadius(widest));
  });

  it('lines the annulus with the last casing that has been set', () => {
    const [conductor, surface] = SECTIONS;
    const deep = surface.shoeDepth + 10;
    expect(lastSetCasing(conductor.shoeDepth - 1)).toBeUndefined();
    const lastSet = lastSetCasing(deep);
    expect(lastSet?.section.id).toBe(surface.id);
    expect(annulusWall(SEABED_DEPTH_M + 5, lastSet)).toBeCloseTo(casingInner(surface.casingInches));
    expect(annulusWall(deep, lastSet)).toBeCloseTo(holeAt(deep).radius);
  });

  it('moves only the underwater part with the sea', () => {
    expect(wellY(10, -5)).toBeCloseTo(15);
    expect(wellY(SEABED_DEPTH_M, -5)).toBeCloseTo(wellY(SEABED_DEPTH_M, 0) - 5);
  });
});
