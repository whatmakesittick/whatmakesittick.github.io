import { describe, expect, it } from 'vitest';
import { SPEED_RANGE, rate } from './playback';
import { SORTIE_SECONDS } from './sortie';

describe('playback', () => {
  it('plays the sortie in real time at normal speed', () => {
    expect(rate(1)).toBe(1);
    expect(SORTIE_SECONDS / rate(1)).toBe(80);
  });

  it('runs from a quarter to four times real time', () => {
    expect(SPEED_RANGE).toEqual({ min: 0.25, max: 4, step: 0.25, default: 1 });
    expect(SORTIE_SECONDS / rate(SPEED_RANGE.max)).toBe(20);
    expect(SORTIE_SECONDS / rate(SPEED_RANGE.min)).toBe(320);
  });
});
