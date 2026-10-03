import { describe, expect, it } from 'vitest';
import { SPEED_RANGE, rate } from './playback';
import { RUN_SECONDS } from './run';

describe('playback', () => {
  it('plays the run in two minutes at normal speed, one model second a second', () => {
    expect(rate(1)).toBe(1);
    expect(RUN_SECONDS / rate(1)).toBe(120);
  });

  it('runs from a quarter to four times normal speed', () => {
    expect(SPEED_RANGE).toEqual({ min: 0.25, max: 4, step: 0.25, default: 1 });
    expect(RUN_SECONDS / rate(SPEED_RANGE.max)).toBe(30);
    expect(RUN_SECONDS / rate(SPEED_RANGE.min)).toBe(480);
  });
});
