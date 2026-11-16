import { describe, expect, it } from 'vitest';
import {
  COLOUR_RATIO_LIMIT,
  IODATE_RANGE_MM,
  MIN_SWITCH_S,
  TEMPERATURE_RANGE_C,
  bisulfiteRatio,
  switchSeconds,
  toMolar,
  warmthFactor,
} from './recipe';

const DEFAULT_IODATE_M = toMolar(IODATE_RANGE_MM.default);
const DEFAULT_TEMPERATURE_C = TEMPERATURE_RANGE_C.default;

describe('recipe', () => {
  it('switches after 10 s at the defaults', () => {
    expect(switchSeconds(DEFAULT_IODATE_M, DEFAULT_TEMPERATURE_C)).toBeCloseTo(10, 9);
  });

  it('halves the delay with twice the iodate and doubles it with half', () => {
    const base = switchSeconds(DEFAULT_IODATE_M, DEFAULT_TEMPERATURE_C);
    expect(switchSeconds(DEFAULT_IODATE_M * 2, DEFAULT_TEMPERATURE_C)).toBeCloseTo(base / 2, 9);
    expect(switchSeconds(DEFAULT_IODATE_M / 2, DEFAULT_TEMPERATURE_C)).toBeCloseTo(base * 2, 9);
  });

  it('is slower in the cold and faster when warm', () => {
    expect(warmthFactor(DEFAULT_TEMPERATURE_C)).toBe(1);
    expect(warmthFactor(0)).toBeCloseTo(1.5, 9);
    expect(warmthFactor(TEMPERATURE_RANGE_C.max)).toBeLessThan(1);
  });

  it('keeps the switch between about 3.3 and 33.9 s across the controls', () => {
    const fastest = switchSeconds(toMolar(IODATE_RANGE_MM.max), TEMPERATURE_RANGE_C.max);
    const slowest = switchSeconds(toMolar(IODATE_RANGE_MM.min), TEMPERATURE_RANGE_C.min);
    expect(fastest).toBeCloseTo(3.33, 2);
    expect(slowest).toBeCloseTo(33.9, 1);
    expect(fastest).toBeGreaterThanOrEqual(MIN_SWITCH_S);
  });

  it('always leaves bisulfite under three times the iodate, so the colour shows', () => {
    const ratios = [IODATE_RANGE_MM.min, IODATE_RANGE_MM.max].map((mm) =>
      bisulfiteRatio(toMolar(mm)),
    );
    expect(ratios[0]).toBeCloseTo(1.25, 9);
    expect(ratios[1]).toBeCloseTo(0.25, 9);
    ratios.forEach((ratio) => expect(ratio).toBeLessThan(COLOUR_RATIO_LIMIT));
  });
});
