import { describe, expect, it } from 'vitest';
import { PHASE_IDS } from '../ids';
import { CYCLE_UNITS } from './clock';
import { PHASE_RANGES, phaseIdAt } from './phases';

describe('cycle phases', () => {
  it('covers the cycle in order with the spec ranges', () => {
    expect(PHASE_IDS.map((id) => [PHASE_RANGES[id].start, PHASE_RANGES[id].end])).toEqual([
      [0, 10],
      [10, 40],
      [40, 55],
      [55, 75],
      [75, 95],
      [95, 100],
    ]);
    expect(PHASE_RANGES.ready.end).toBe(CYCLE_UNITS);
  });

  it('names the phase at any point of the scrubber', () => {
    expect([0, 9.9, 10, 39.9, 40, 60, 80, 97, 100].map(phaseIdAt)).toEqual([
      'strike',
      'strike',
      'barrel',
      'barrel',
      'unlock',
      'eject',
      'feed',
      'ready',
      'ready',
    ]);
  });
});
