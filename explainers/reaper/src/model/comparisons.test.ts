import { describe, expect, it } from 'vitest';
import { COMPARED_FIGURES, REAPER_FIGURES, timesOther } from './comparisons';

describe('aircraft compared', () => {
  it('uses the sourced figures', () => {
    expect(REAPER_FIGURES).toEqual({ spanM: 20.1, weightKg: 4760, powerHp: 900, aspectRatio: 17 });
    expect(COMPARED_FIGURES.predator).toEqual({ spanM: 16.8, weightKg: 1020, powerHp: 115 });
    expect(COMPARED_FIGURES.cessna).toEqual({ spanM: 11, weightKg: 1157, aspectRatio: 7.5 });
  });

  it('weighs 4.7 Predators and has 7.8 times its power', () => {
    expect(timesOther('weightKg', 'predator')).toBeCloseTo(4.67, 2);
    expect(timesOther('powerHp', 'predator')).toBeCloseTo(7.83, 2);
  });

  it('spans 1.8 Cessnas with a wing 2.3 times as slender', () => {
    expect(timesOther('spanM', 'cessna')).toBeCloseTo(1.83, 2);
    expect(timesOther('aspectRatio', 'cessna')).toBeCloseTo(2.27, 2);
  });

  it('leaves out what no source gives', () => {
    expect(timesOther('powerHp', 'cessna')).toBeUndefined();
    expect(timesOther('aspectRatio', 'predator')).toBeUndefined();
  });
});
