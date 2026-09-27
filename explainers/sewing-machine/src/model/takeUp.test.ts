import { describe, expect, it } from 'vitest';
import { PHASE_RANGES } from './cycle';
import { takeUpLift } from './takeUp';

describe('takeUpLift', () => {
  it('starts each stitch at the top of its travel', () => {
    expect(takeUpLift(0)).toBe(1);
  });

  it('stays low to give slack while the hook carries the loop', () => {
    [PHASE_RANGES.wrap.start, 280, PHASE_RANGES.wrap.end - 1].forEach((angle) =>
      expect(takeUpLift(angle)).toBe(0),
    );
  });

  it('rises through the set phase to pull the stitch tight', () => {
    const quarter = takeUpLift(330);
    const half = takeUpLift(340);
    expect(quarter).toBeGreaterThan(0);
    expect(half).toBeGreaterThan(quarter);
    expect(takeUpLift(PHASE_RANGES.set.end - 1e-6)).toBeCloseTo(1);
  });
});
