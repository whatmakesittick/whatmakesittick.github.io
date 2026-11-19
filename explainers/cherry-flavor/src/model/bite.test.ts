import { describe, expect, it } from 'vitest';
import { biteTemperature, inMouth, meltEndSeconds, meltShare, swallowShare } from './bite';

const SERVING_C = -12;

describe('bite temperature', () => {
  it('starts at the serving temperature', () => {
    expect(biteTemperature(-1, SERVING_C)).toBe(SERVING_C);
  });

  it('holds at 0 °C while it melts', () => {
    expect(meltEndSeconds(SERVING_C)).toBeCloseTo(5.1, 6);
    expect(biteTemperature(3, SERVING_C)).toBe(0);
  });

  it('warms toward mouth temperature after melting', () => {
    expect(biteTemperature(8, SERVING_C)).toBeCloseTo(19, 0);
    expect(biteTemperature(12, SERVING_C)).toBeCloseTo(30, 0);
  });

  it('melts fully by the melt end', () => {
    expect(meltShare(1, SERVING_C)).toBe(0);
    expect(meltShare(6, SERVING_C)).toBe(1);
  });

  it('keeps the bite in the mouth until the swallow', () => {
    expect([inMouth(-0.1), inMouth(0), inMouth(11.9), inMouth(12)]).toEqual([
      false,
      true,
      true,
      false,
    ]);
    expect(swallowShare(13)).toBe(1);
  });
});
