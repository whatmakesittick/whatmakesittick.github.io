import { describe, expect, it } from 'vitest';
import { REAL_PACE_SPEED, SPEED_RANGE, loopSeconds, rate, slowdown } from './playback';

describe('playback pace', () => {
  it('takes a quarter as long per shot at every stop, down to real pace', () => {
    expect([0, 1, 2, 3, 4].map(loopSeconds).map((seconds) => Number(seconds.toFixed(4)))).toEqual([
      25.6, 6.4, 1.6, 0.4, 0.1,
    ]);
    expect(loopSeconds(REAL_PACE_SPEED)).toBeCloseTo(0.1, 12);
  });

  it('slows the real pace down 4, 16, 64 and 256 times', () => {
    expect([0, 1, 2, 3, 4].map(slowdown)).toEqual([256, 64, 16, 4, 1]);
  });

  it('runs the whole scrubber in one loop at any stop', () => {
    [0, 1, 2, 3, 4].forEach((speed) => expect(rate(speed) * loopSeconds(speed)).toBeCloseTo(100));
    expect(rate(REAL_PACE_SPEED)).toBeCloseTo(1000);
  });

  it('starts at 6.4 s per shot', () => {
    expect(SPEED_RANGE).toEqual({ min: 0, max: 4, step: 1, default: 1 });
  });
});
