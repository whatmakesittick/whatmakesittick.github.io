import { describe, expect, it } from 'vitest';
import { REAL_TIME_SPEED, SPEED_RANGE, nominalRate, speedFactor } from './playback';
import { UNITS_PER_S } from './timeMap';

describe('playback', () => {
  it('plays the bite in real time at the default speed', () => {
    expect(SPEED_RANGE.default).toBe(REAL_TIME_SPEED);
    expect(speedFactor(REAL_TIME_SPEED)).toBe(1);
    expect(nominalRate(REAL_TIME_SPEED)).toBe(UNITS_PER_S);
  });

  it('halves or doubles the pace one step at a time', () => {
    expect([0, 1, 2, 3].map(speedFactor)).toEqual([0.25, 0.5, 1, 2]);
  });
});
