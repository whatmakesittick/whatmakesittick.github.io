import { describe, expect, it } from 'vitest';
import { FIELD_IDS } from '../ids';
import {
  brightnessOrder,
  relativeBrightness,
  tipComponents,
  tissueSignal,
  tissueSignals,
} from './signal';

describe('tissue signal', () => {
  it('follows the spin echo signal equation', () => {
    const expected = (1 - Math.exp(-500 / 260)) * Math.exp(-15 / 80);
    expect(tissueSignal('fat', 'field15', 't1')).toBeCloseTo(expected, 10);
  });

  it.each(FIELD_IDS)('makes fat brightest and fluid darkest on T1 at %s', (field) => {
    expect(brightnessOrder(field, 't1')).toEqual(['fat', 'whiteMatter', 'greyMatter', 'fluid']);
  });

  it.each(FIELD_IDS)('makes fluid brightest and white matter dark on T2 at %s', (field) => {
    const signals = tissueSignals(field, 't2');
    expect(brightnessOrder(field, 't2')[0]).toBe('fluid');
    expect(signals.fluid).toBeGreaterThan(signals.greyMatter);
    expect(signals.greyMatter).toBeGreaterThan(signals.whiteMatter);
  });

  it('scales every tissue against the brightest one', () => {
    const relative = relativeBrightness('field30', 't2');
    expect(relative.fluid).toBe(1);
    for (const share of Object.values(relative)) {
      expect(share).toBeGreaterThan(0);
      expect(share).toBeLessThanOrEqual(1);
    }
  });
});

describe('tip components', () => {
  it('splits the net magnet along and across the field', () => {
    expect(tipComponents(0)).toEqual({ along: 1, across: 0 });
    expect(tipComponents(90).along).toBeCloseTo(0, 12);
    expect(tipComponents(90).across).toBeCloseTo(1, 12);
    expect(tipComponents(180).along).toBeCloseTo(-1, 12);
  });
});
