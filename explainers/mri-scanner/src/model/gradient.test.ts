import { describe, expect, it } from 'vitest';
import {
  edgeShiftMT,
  frequencySpreadKHz,
  gradientLevel,
  RAMP_UNITS,
  riseTimeMs,
  shareOfField,
} from './gradient';
import { PHASE_RANGES } from './sequence';

describe('gradient figures', () => {
  it('shifts the field by 5.4 mT at the edge of a 24 cm head', () => {
    expect(edgeShiftMT()).toBeCloseTo(5.4, 10);
  });

  it('is a small share of the main field', () => {
    expect(shareOfField('field15')).toBeCloseTo(0.36, 10);
    expect(shareOfField('field30')).toBeCloseTo(0.18, 10);
  });

  it('spreads the frequency by about 230 kHz', () => {
    expect(frequencySpreadKHz()).toBeCloseTo(229.9, 1);
  });

  it('rises in 0.225 ms', () => {
    expect(riseTimeMs()).toBeCloseTo(0.225, 10);
  });
});

describe('gradient level', () => {
  it('is off while the spins recover', () => {
    expect(gradientLevel(800)).toBe(0);
  });

  it('ramps up and down at the edges of each step', () => {
    const [start, end] = PHASE_RANGES.encode;
    expect(gradientLevel(start)).toBe(0);
    expect(gradientLevel(start + RAMP_UNITS / 2)).toBeCloseTo(0.5, 10);
    expect(gradientLevel((start + end) / 2)).toBe(1);
    expect(gradientLevel(end - RAMP_UNITS / 4)).toBeCloseTo(0.25, 10);
  });
});
