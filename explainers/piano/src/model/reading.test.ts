import { describe, expect, it } from 'vitest';
import type { PedalId, RegisterId } from '../ids';
import { SYMPATHY_SHARE } from './constants';
import { levelDbAt, strokeReadingAt } from './reading';
import { peakLevelDb } from './tone';
import { CYCLE_UNITS, MOMENTS } from './timing';

const DIGITS = 6;
const LOOSE = 2;

describe('stroke reading', () => {
  it('is silent before the strike and after the damper lands', () => {
    expect(levelDbAt(MOMENTS.strike - 1, 'medium', 'none', 'middle')).toBeNull();
    expect(levelDbAt(MOMENTS.damped, 'medium', 'none', 'middle')).toBeNull();
    expect(strokeReadingAt(0, 'medium', 'none', 'middle').stringShare).toBe(0);
  });

  it('starts at the peak level and fades while the key is held', () => {
    const peak = peakLevelDb('medium', 'none', 'middle');
    expect(levelDbAt(MOMENTS.strike, 'medium', 'none', 'middle')).toBeCloseTo(peak, DIGITS);
    const late = levelDbAt(MOMENTS.damped - 1, 'medium', 'none', 'middle') ?? 0;
    expect(late).toBeLessThan(peak - 15);
  });

  it('keeps ringing across the loop with sustain and in the treble', () => {
    const ringing: readonly (readonly [PedalId, RegisterId])[] = [
      ['sustain', 'middle'],
      ['none', 'treble'],
    ];
    ringing.forEach(([pedal, register]) => {
      const end = levelDbAt(CYCLE_UNITS - 1e-6, 'medium', pedal, register);
      const start = levelDbAt(0, 'medium', pedal, register);
      expect(end).not.toBeNull();
      expect(start ?? 0).toBeCloseTo(end ?? 1, LOOSE);
    });
  });

  it('lets the other strings ring along only with sustain', () => {
    const held = strokeReadingAt(700, 'hard', 'sustain', 'middle');
    expect(held.sympathyShare).toBeCloseTo(SYMPATHY_SHARE * held.stringShare, DIGITS);
    expect(strokeReadingAt(700, 'hard', 'none', 'middle').sympathyShare).toBe(0);
  });

  it('reports the step, strings struck and the damper state', () => {
    const reading = strokeReadingAt(MOMENTS.checked, 'soft', 'unaCorda', 'bass');
    expect(reading).toMatchObject({
      phase: 'check',
      stringsStruck: 1,
      strings: 2,
      damperState: 'up',
    });
  });
});
