import { describe, expect, it } from 'vitest';
import {
  NOMINAL_UNITS_PER_S,
  REAL_TIME_SPEED,
  REF_SWITCH_S,
  SPEED_RANGE,
  nominalRate,
  speedFactor,
} from './playback';

describe('playback', () => {
  it('plays at a quarter, half, real and double speed', () => {
    const stops = Array.from(
      { length: SPEED_RANGE.max - SPEED_RANGE.min + 1 },
      (_, index) => SPEED_RANGE.min + index,
    );
    expect(stops.map(speedFactor)).toEqual([0.25, 0.5, 1, 2]);
    expect(SPEED_RANGE.default).toBe(REAL_TIME_SPEED);
    expect(speedFactor(REAL_TIME_SPEED)).toBe(1);
  });

  it('switches after 10 s for recipe A at 20 °C', () => {
    expect(REF_SWITCH_S).toBe(10);
  });

  it('runs the induction at 57.5 units a second in real time', () => {
    expect(NOMINAL_UNITS_PER_S).toBeCloseTo(57.5, 9);
    expect(nominalRate(REAL_TIME_SPEED)).toBeCloseTo(57.5, 9);
    expect(nominalRate(SPEED_RANGE.max)).toBeCloseTo(115, 9);
  });
});
