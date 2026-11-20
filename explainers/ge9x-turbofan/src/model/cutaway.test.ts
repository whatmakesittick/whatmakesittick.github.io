import { describe, expect, it } from 'vitest';
import { CUTAWAY_SECONDS, cutawayTarget, ease, reverserTarget } from './cutaway';

describe('cutaway', () => {
  it('names the targets', () => {
    expect(cutawayTarget('cutaway')).toBe(1);
    expect(cutawayTarget('closed')).toBe(0);
    expect(reverserTarget(true)).toBe(1);
    expect(reverserTarget(false)).toBe(0);
  });

  it('eases to the target without overshoot', () => {
    expect(ease(0, 1, CUTAWAY_SECONDS / 2, CUTAWAY_SECONDS)).toBeCloseTo(0.5);
    expect(ease(0.9, 1, 5, CUTAWAY_SECONDS)).toBe(1);
    expect(ease(1, 0, 5, CUTAWAY_SECONDS)).toBe(0);
  });
});
