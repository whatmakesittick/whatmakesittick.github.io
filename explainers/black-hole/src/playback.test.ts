import { describe, expect, it } from 'vitest';
import { REAL_TIME_SPEED, SPEED_RANGE, playbackFactor } from './playback';

describe('playback speed', () => {
  it('doubles at every stop from real time to 32 times faster', () => {
    expect([0, 1, 2, 3, 4, 5].map(playbackFactor)).toEqual([1, 2, 4, 8, 16, 32]);
    expect(playbackFactor(REAL_TIME_SPEED)).toBe(1);
  });

  it('starts at eight times faster and runs the whole fall in about 93 s', () => {
    expect(SPEED_RANGE).toEqual({ min: 0, max: 5, step: 1, default: 3 });
    expect(playbackFactor(SPEED_RANGE.default)).toBe(8);
  });
});
