import { describe, expect, it } from 'vitest';
import { PEDAL_IDS, REGISTER_IDS, TOUCH_IDS } from '../ids';
import { LEVEL_RANGE_DB, SPECTRUM_LIMIT_HZ } from './constants';
import {
  MIN_PARTIAL_AMPLITUDE,
  NOTES,
  STRETCH_PARTIAL,
  T60_SECONDS,
  centsSharp,
  decayFor,
  fallDbAfter,
  fundamentalHz,
  levelDbAfter,
  noteDamped,
  noteSpec,
  thumpGain,
  partialAmplitudes,
  partialCount,
  partialHz,
  peakLevelDb,
  stringsStruck,
} from './tone';

const DIGITS = 6;
const MAX_OSCILLATORS_PER_NOTE = 36;

function highShare(amplitudes: readonly number[]): number {
  return amplitudes.slice(amplitudes.length / 2).reduce((sum, value) => sum + value, 0);
}

describe('notes', () => {
  it('tunes C2, C4 and C7 from A4 = 440 Hz', () => {
    expect(fundamentalHz('bass')).toBeCloseTo(65.406, 3);
    expect(fundamentalHz('middle')).toBeCloseTo(261.626, 3);
    expect(fundamentalHz('treble')).toBeCloseTo(2093.005, 3);
  });

  it('gives the bass two wound strings and no damper to the treble', () => {
    expect(NOTES.bass).toMatchObject({ strings: 2, wound: true, damper: true });
    expect(NOTES.middle).toMatchObject({ strings: 3, wound: false, damper: true });
    expect(NOTES.treble).toMatchObject({ strings: 3, wound: false, damper: false });
  });
});

describe('thump', () => {
  it('follows touch only, never the pedal', () => {
    expect(thumpGain('hard')).toBeCloseTo(0.3, DIGITS);
    expect(thumpGain('soft')).toBeLessThan(thumpGain('medium'));
    expect(noteSpec('medium', 'unaCorda', 'middle').thumpGain).toBe(
      noteSpec('medium', 'none', 'middle').thumpGain,
    );
  });
});

describe('partials', () => {
  it('runs sharp as a stiff string does', () => {
    expect(centsSharp(STRETCH_PARTIAL.middle, 'middle')).toBeCloseTo(18.1, 1);
    expect(centsSharp(STRETCH_PARTIAL.bass, 'bass')).toBeCloseTo(2.1, 1);
    expect(partialHz(1, 'middle')).toBeGreaterThan(fundamentalHz('middle'));
  });

  it('keeps 16, 12 and 4 partials under the spectrum limits', () => {
    expect(REGISTER_IDS.map(partialCount)).toEqual([16, 12, 4]);
    REGISTER_IDS.forEach((register) =>
      expect(partialHz(partialCount(register), register)).toBeLessThanOrEqual(
        SPECTRUM_LIMIT_HZ[register],
      ),
    );
  });

  it('numbers each partial by its harmonic order, skipping the dropped ones', () => {
    const numbers = noteSpec('medium', 'none', 'middle').partials.map(({ n }) => n);
    expect(numbers).not.toContain(8);
    expect(numbers.slice(0, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('silences the 8th partial when the hammer strikes at one eighth', () => {
    const amplitudes = partialAmplitudes('medium', 'none', 'middle');
    expect(amplitudes.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, DIGITS);
    expect(amplitudes[7]).toBeLessThan(MIN_PARTIAL_AMPLITUDE);
  });

  it('sounds brighter for a harder touch and duller with una corda', () => {
    const soft = highShare(partialAmplitudes('soft', 'none', 'middle'));
    const medium = highShare(partialAmplitudes('medium', 'none', 'middle'));
    const hard = highShare(partialAmplitudes('hard', 'none', 'middle'));
    expect(soft).toBeLessThan(medium);
    expect(medium).toBeLessThan(hard);
    expect(highShare(partialAmplitudes('medium', 'unaCorda', 'middle'))).toBeLessThan(medium);
  });
});

describe('loudness and decay', () => {
  it('starts 14 and 10 dB under a hard strike, and lower with una corda', () => {
    expect(peakLevelDb('hard', 'none', 'middle')).toBe(0);
    expect(peakLevelDb('soft', 'none', 'middle')).toBeCloseTo(-13.98, 2);
    expect(peakLevelDb('medium', 'none', 'middle')).toBeCloseTo(-9.63, 2);
    expect(peakLevelDb('hard', 'unaCorda', 'middle')).toBeCloseTo(-3.52, 2);
    expect(peakLevelDb('hard', 'unaCorda', 'bass')).toBeCloseTo(-6.02, 2);
  });

  it('strikes one string fewer with una corda', () => {
    expect(stringsStruck('middle', 'unaCorda')).toBe(2);
    expect(stringsStruck('bass', 'unaCorda')).toBe(1);
    expect(stringsStruck('treble', 'sustain')).toBe(3);
  });

  it('fades in two stages and falls 60 dB in the measured time', () => {
    REGISTER_IDS.forEach((register) =>
      PEDAL_IDS.forEach((pedal) => {
        const decay = decayFor(pedal, register);
        const t60 =
          pedal === 'sustain' ? T60_SECONDS[register].sustain : T60_SECONDS[register].held;
        expect(fallDbAfter(t60, decay)).toBeCloseTo(LEVEL_RANGE_DB, DIGITS);
        expect(fallDbAfter(1, decay)).toBeCloseTo(decay.promptDbPerSecond, DIGITS);
      }),
    );
    expect(levelDbAfter(0, 'medium', 'none', 'middle')).toBe(
      peakLevelDb('medium', 'none', 'middle'),
    );
  });
});

describe('note spec', () => {
  it('stays inside the oscillator budget for every choice', () => {
    TOUCH_IDS.forEach((touch) =>
      PEDAL_IDS.forEach((pedal) =>
        REGISTER_IDS.forEach((register) => {
          const spec = noteSpec(touch, pedal, register);
          const oscillators = spec.partials.length * spec.stringDetuneCents.length;
          expect(oscillators).toBeLessThanOrEqual(MAX_OSCILLATORS_PER_NOTE);
          expect(spec.peakGain).toBeLessThanOrEqual(1);
          expect(spec.attackSeconds).toBeGreaterThan(0);
        }),
      ),
    );
  });

  it('keeps ringing after release with sustain or without a damper', () => {
    expect(noteDamped('none', 'middle')).toBe(true);
    expect(noteDamped('sustain', 'middle')).toBe(false);
    expect(noteDamped('none', 'treble')).toBe(false);
    expect(noteSpec('medium', 'none', 'treble').damped).toBe(false);
  });

  it('detunes one oscillator set per struck string', () => {
    expect(noteSpec('medium', 'none', 'middle').stringDetuneCents).toEqual([0, 0.5, -0.5]);
    expect(noteSpec('medium', 'unaCorda', 'bass').stringDetuneCents).toEqual([0]);
  });
});
