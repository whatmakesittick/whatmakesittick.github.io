import { describe, expect, it } from 'vitest';
import { PHASE_IDS } from '../ids';
import {
  CYCLE_UNITS,
  END_S,
  MOMENTS,
  PHASE_RANGES,
  PHASE_SECONDS,
  START_S,
  UNITS_PER_S,
  phaseIdAt,
  phaseProgress,
  secondsAt,
  unitsAt,
} from './timeMap';

const UNITS = Array.from({ length: 101 }, (_, index) => index * 10);

describe('time map', () => {
  it('tiles the bite with the phases in order', () => {
    expect(PHASE_RANGES.spoon.start).toBe(0);
    expect(PHASE_RANGES.swallow.end).toBe(CYCLE_UNITS);
    PHASE_IDS.slice(1).forEach((id, index) =>
      expect(PHASE_RANGES[id].start).toBe(PHASE_RANGES[PHASE_IDS[index]].end),
    );
  });

  it('runs from two seconds before the spoon enters to eighteen seconds after', () => {
    expect(secondsAt(0)).toBe(START_S);
    expect(secondsAt(CYCLE_UNITS)).toBe(END_S);
    expect(START_S + CYCLE_UNITS / UNITS_PER_S).toBe(END_S);
  });

  it('maps the phase borders to the table', () => {
    const borders = PHASE_IDS.map((id) => PHASE_SECONDS[id].start);
    expect(borders).toEqual([-2, 0, 1.5, 5, 8, 12]);
    expect(PHASE_SECONDS.swallow.end).toBe(18);
  });

  it('round-trips seconds and units and clamps outside the run', () => {
    UNITS.forEach((units) => expect(unitsAt(secondsAt(units))).toBeCloseTo(units, 9));
    expect(unitsAt(-5)).toBe(0);
    expect(unitsAt(40)).toBe(CYCLE_UNITS);
    expect(secondsAt(-10)).toBe(START_S);
  });

  it('finds the phase and the progress through it', () => {
    expect(phaseIdAt(0)).toBe('spoon');
    expect(phaseIdAt(100)).toBe('tongue');
    expect(phaseIdAt(600)).toBe('receptors');
    expect(phaseIdAt(CYCLE_UNITS)).toBe('swallow');
    expect(phaseProgress(50)).toBe(0.5);
    expect(phaseProgress(CYCLE_UNITS)).toBe(1);
  });

  it('places the moments at 0, 5, 10 and 12 seconds', () => {
    expect(secondsAt(MOMENTS.inMouth)).toBe(0);
    expect(secondsAt(MOMENTS.melted)).toBe(5);
    expect(secondsAt(MOMENTS.firing)).toBe(10);
    expect(secondsAt(MOMENTS.swallow)).toBe(12);
    expect(phaseIdAt(MOMENTS.firing)).toBe('receptors');
  });
});
