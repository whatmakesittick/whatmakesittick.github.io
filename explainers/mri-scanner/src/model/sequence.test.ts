import { describe, expect, it } from 'vitest';
import { PHASE_IDS, WEIGHTING_IDS } from '../ids';
import {
  CYCLE_UNITS,
  DEFAULT_SPEED,
  LINE_DONE_UNITS,
  MOMENTS,
  PHASE_RANGES,
  PICTURE_SPEED,
  SPEED_RANGE,
  WEIGHTINGS,
  activeGradient,
  phaseAt,
  phaseOf,
  rate,
  realMs,
  rfPulse,
  scanSeconds,
} from './sequence';
import { MODEL_SIZE } from './constants';

const KNOT_UNITS = [0, 150, 300, 420, 535, 650, 1000];
const KNOT_MS = {
  t1: [0, 3, 6.5, 8.5, 15, 19, 500],
  t2: [0, 3, 49, 51, 100, 104, 2500],
} as const;

describe('spin echo sequence', () => {
  it('uses TR 500 ms, TE 15 ms for T1 and TR 2,500 ms, TE 100 ms for T2', () => {
    expect(WEIGHTINGS).toEqual({ t1: { tr: 500, te: 15 }, t2: { tr: 2500, te: 100 } });
  });

  it('splits one repetition into five touching steps', () => {
    expect(PHASE_RANGES.excite[0]).toBe(0);
    PHASE_IDS.slice(1).forEach((id, index) => {
      expect(PHASE_RANGES[id][0]).toBe(PHASE_RANGES[PHASE_IDS[index]][1]);
    });
    expect(PHASE_RANGES.recover[1]).toBe(CYCLE_UNITS);
    expect(LINE_DONE_UNITS).toBe(650);
  });

  it('puts each moment in its step', () => {
    expect(MOMENTS).toEqual({ pulse90: 75, pulse180: 360, echoPeak: 535, repetitionEnd: 990 });
    expect(phaseOf(MOMENTS.pulse90)).toBe('excite');
    expect(phaseOf(MOMENTS.pulse180)).toBe('refocus');
    expect(phaseOf(MOMENTS.echoPeak)).toBe('echo');
    expect(phaseOf(MOMENTS.repetitionEnd)).toBe('recover');
  });

  it.each(WEIGHTING_IDS)('maps the %s knots to real milliseconds and back', (weighting) => {
    KNOT_UNITS.forEach((units, index) => {
      expect(realMs(units, weighting)).toBeCloseTo(KNOT_MS[weighting][index], 9);
      expect(phaseAt(KNOT_MS[weighting][index], weighting)).toBeCloseTo(units, 9);
    });
    expect(realMs(MOMENTS.echoPeak, weighting)).toBe(WEIGHTINGS[weighting].te);
    expect(realMs(MOMENTS.pulse180, weighting)).toBeCloseTo(WEIGHTINGS[weighting].te / 2, 9);
  });

  it.each(WEIGHTING_IDS)('keeps the %s map rising and its inverse exact', (weighting) => {
    let previous = -1;
    for (let units = 0; units <= CYCLE_UNITS; units += 5) {
      const ms = realMs(units, weighting);
      expect(ms).toBeGreaterThan(previous);
      expect(phaseAt(ms, weighting)).toBeCloseTo(units, 6);
      previous = ms;
    }
  });

  it('clamps outside one repetition', () => {
    expect(realMs(-10, 't1')).toBe(0);
    expect(realMs(CYCLE_UNITS + 10, 't2')).toBe(2500);
    expect(phaseAt(9000, 't2')).toBe(CYCLE_UNITS);
  });

  it('names the step, the gradient and the radio pulse at each unit', () => {
    expect([0, 149, 150, 300, 420, 649, 650, 1000].map(phaseOf)).toEqual([
      'excite',
      'excite',
      'encode',
      'refocus',
      'echo',
      'echo',
      'recover',
      'recover',
    ]);
    expect([75, 200, 360, 535, 800].map(activeGradient)).toEqual(['z', 'y', 'z', 'x', null]);
    expect([75, 200, 360, 535, 800].map(rfPulse)).toEqual([90, null, 180, null, null]);
  });

  it('runs 6 repetitions a minute by default and fills the 64 lines in about two minutes at 30', () => {
    expect(SPEED_RANGE).toEqual({ min: 2, max: 60, step: 1, default: 6 });
    expect(DEFAULT_SPEED).toBe(6);
    expect(rate(DEFAULT_SPEED)).toBe(100);
    expect((MODEL_SIZE * CYCLE_UNITS) / rate(PICTURE_SPEED)).toBe(128);
  });

  it('takes 128 s for a T1 scan and 640 s for a T2 scan of 256 lines', () => {
    expect(scanSeconds('t1')).toBe(128);
    expect(scanSeconds('t2')).toBe(640);
  });
});
