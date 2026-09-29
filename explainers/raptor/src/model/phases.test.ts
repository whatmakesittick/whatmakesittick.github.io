import { describe, expect, it } from 'vitest';
import { PHASE_IDS } from '../ids';
import { RUN_LENGTH, phaseAt } from './flight';
import { MOMENTS, PHASE_RANGES, phaseIdAt } from './phases';

describe('launch phases', () => {
  it('covers the whole run in order with no gaps', () => {
    expect(PHASE_RANGES.start.start).toBe(0);
    expect(PHASE_RANGES.cutoff.end).toBe(RUN_LENGTH);
    PHASE_IDS.slice(1).forEach((id, index) =>
      expect(PHASE_RANGES[id].start, id).toBe(PHASE_RANGES[PHASE_IDS[index]].end),
    );
  });

  it('matches the flight clock of the spec', () => {
    expect(PHASE_IDS.map((id) => PHASE_RANGES[id].start)).toEqual([0, 3, 23, 45, 71, 133]);
    expect(PHASE_RANGES.maxQ.start).toBe(phaseAt(42));
    expect(PHASE_RANGES.thinAir.start).toBe(phaseAt(68));
  });

  it('names the phase at any moment, the last one up to the very end', () => {
    expect(phaseIdAt(0)).toBe('start');
    expect(phaseIdAt(2.9)).toBe('start');
    expect(phaseIdAt(3)).toBe('liftoff');
    expect(phaseIdAt(55)).toBe('maxQ');
    expect(phaseIdAt(RUN_LENGTH)).toBe('cutoff');
  });

  it('puts the moments at liftoff, max-Q and just before cutoff', () => {
    expect(MOMENTS).toEqual({ liftoff: 3, maxQ: 55, cutoff: 139 });
    expect(phaseIdAt(MOMENTS.maxQ)).toBe('maxQ');
    expect(phaseIdAt(MOMENTS.cutoff)).toBe('cutoff');
  });
});
