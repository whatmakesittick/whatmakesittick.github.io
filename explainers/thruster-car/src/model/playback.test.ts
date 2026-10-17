import { describe, expect, it } from 'vitest';
import { SPEED_RANGE, rate } from './playback';

describe('playback', () => {
  it('plays the run in real time by default, from a quarter to twice as fast', () => {
    expect(SPEED_RANGE).toEqual({ min: 0.25, max: 2, step: 0.25, default: 1 });
    expect(rate(SPEED_RANGE.default)).toBe(1);
    expect(rate(SPEED_RANGE.min)).toBe(0.25);
    expect(rate(SPEED_RANGE.max)).toBe(2);
  });
});
