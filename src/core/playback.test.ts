import { describe, expect, it } from 'vitest';
import { slowMotionFactor } from './playback';

describe('slow motion', () => {
  it('halves the slow motion at every stop up to real time', () => {
    expect([0, 1, 2, 3, 4, 5].map((speed) => slowMotionFactor(speed, 5))).toEqual([
      32, 16, 8, 4, 2, 1,
    ]);
  });

  it('plays in real time at whichever stop the explainer calls real time', () => {
    expect(slowMotionFactor(8, 8)).toBe(1);
    expect(slowMotionFactor(0, 8)).toBe(256);
  });
});
