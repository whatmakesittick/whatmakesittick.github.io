import { describe, expect, it } from 'vitest';
import { REAL_TIME_SPEED, beatMsPerSecond, slowMotionFactor } from './playback';

describe('slow motion', () => {
  it('halves the slow motion at every stop up to real time', () => {
    expect([0, 1, 2, 3, 4, 5].map(slowMotionFactor)).toEqual([32, 16, 8, 4, 2, 1]);
    expect(slowMotionFactor(REAL_TIME_SPEED)).toBe(1);
  });

  it('plays a second of heart time every real second at real time', () => {
    expect(beatMsPerSecond(REAL_TIME_SPEED)).toBe(1000);
    expect(beatMsPerSecond(2)).toBe(125);
    expect(800 / beatMsPerSecond(0)).toBeCloseTo(25.6);
  });
});
