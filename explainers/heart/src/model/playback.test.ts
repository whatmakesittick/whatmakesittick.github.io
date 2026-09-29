import { describe, expect, it } from 'vitest';
import { REAL_TIME_SPEED, beatMsPerSecond } from './playback';

describe('slow motion', () => {
  it('plays a second of heart time every real second at real time', () => {
    expect(beatMsPerSecond(REAL_TIME_SPEED)).toBe(1000);
    expect(beatMsPerSecond(2)).toBe(125);
    expect(800 / beatMsPerSecond(0)).toBeCloseTo(25.6);
  });
});
