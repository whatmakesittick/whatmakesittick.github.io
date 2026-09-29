import { describe, expect, it } from 'vitest';
import { REAL_TIME_SPEED, burnSecondsPerSecond, playbackFactor } from './playback';

describe('playback', () => {
  it('plays in real time at the middle stop', () => {
    expect(REAL_TIME_SPEED).toBe(3);
    expect(playbackFactor(REAL_TIME_SPEED)).toBe(1);
  });

  it('halves or doubles at every stop', () => {
    expect([0, 1, 2, 3, 4, 5].map(playbackFactor)).toEqual([1 / 8, 1 / 4, 1 / 2, 1, 2, 4]);
    expect(burnSecondsPerSecond(5)).toBe(4);
  });
});
