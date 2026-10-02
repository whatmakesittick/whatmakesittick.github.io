import { describe, expect, it } from 'vitest';
import { PHASE_IDS } from '../ids';
import {
  MOMENTS,
  PHASE_RANGES,
  SORTIE_SECONDS,
  clockAt,
  phaseAt,
  phaseShareAt,
  sortieShareAt,
} from './sortie';

describe('sortie clock', () => {
  it('runs eighty seconds through six phases without gaps', () => {
    expect(SORTIE_SECONDS).toBe(80);
    expect(PHASE_RANGES.takeoff.start).toBe(0);
    expect(PHASE_RANGES.landing.end).toBe(SORTIE_SECONDS);
    PHASE_IDS.slice(1).forEach((id, index) =>
      expect(PHASE_RANGES[id].start).toBe(PHASE_RANGES[PHASE_IDS[index]].end),
    );
  });

  it('names the phase under the scrubber', () => {
    PHASE_IDS.forEach((id) => expect(phaseAt(PHASE_RANGES[id].start)).toBe(id));
    expect(phaseAt(4.9)).toBe('takeoff');
    expect(phaseAt(20)).toBe('transit');
    expect(phaseAt(SORTIE_SECONDS)).toBe('landing');
    expect(phaseAt(500)).toBe('landing');
    expect(phaseShareAt(9)).toBeCloseTo(0.5, 9);
    expect(phaseShareAt(-1)).toBe(0);
  });

  it('places the moments at their seconds', () => {
    expect(MOMENTS).toEqual({ liftoff: 2, cruise: 13, onStation: 27, turnHome: 49, touchdown: 78 });
  });

  it('splits the flight time into minutes and seconds', () => {
    expect(clockAt(0)).toEqual({ minutes: 0, seconds: 0 });
    expect(clockAt(42.4)).toEqual({ minutes: 0, seconds: 42 });
    expect(clockAt(79.6)).toEqual({ minutes: 1, seconds: 20 });
    expect(clockAt(61)).toEqual({ minutes: 1, seconds: 1 });
  });

  it('reads the share of the flight flown', () => {
    expect(sortieShareAt(0)).toBe(0);
    expect(sortieShareAt(40)).toBe(0.5);
    expect(sortieShareAt(90)).toBe(1);
  });
});
