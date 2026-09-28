import { describe, expect, it } from 'vitest';
import { FINAL_DEPTH_M, JOURNEY_CYCLE, PHASE_IDS, PHASE_RANGES, phaseAt } from './journey';

describe('the journey of the bit', () => {
  it('covers the whole well from the drill floor to total depth without gaps', () => {
    expect(PHASE_RANGES[PHASE_IDS[0]].start).toBe(0);
    expect(PHASE_RANGES[PHASE_IDS[PHASE_IDS.length - 1]].end).toBe(JOURNEY_CYCLE);
    for (let i = 1; i < PHASE_IDS.length; i++) {
      expect(PHASE_RANGES[PHASE_IDS[i]].start).toBe(PHASE_RANGES[PHASE_IDS[i - 1]].end);
    }
  });

  it('names the stretch the bit is in', () => {
    expect(phaseAt(0)).toBe('deck');
    expect(phaseAt(500)).toBe('sea');
    expect(phaseAt(1025)).toBe('topHole');
    expect(phaseAt(2025)).toBe('overburden');
    expect(phaseAt(3800)).toBe('seal');
    expect(phaseAt(4100)).toBe('reservoir');
    expect(phaseAt(FINAL_DEPTH_M)).toBe('bottom');
  });
});
