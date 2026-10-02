import { describe, expect, it } from 'vitest';
import { MISSION_UNITS } from './mission';
import { SPEED_RANGE, rate } from './playback';

describe('playback', () => {
  it('plays the whole mission in 90 s at normal speed', () => {
    expect(MISSION_UNITS / rate(1)).toBeCloseTo(90, 9);
  });

  it('runs from a quarter to four times normal speed', () => {
    expect(SPEED_RANGE).toEqual({ min: 0.25, max: 4, step: 0.25, default: 1 });
    expect(MISSION_UNITS / rate(SPEED_RANGE.max)).toBeCloseTo(22.5, 9);
    expect(MISSION_UNITS / rate(SPEED_RANGE.min)).toBeCloseTo(360, 9);
  });
});
