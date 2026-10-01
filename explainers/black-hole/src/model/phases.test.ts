import { describe, expect, it } from 'vitest';
import { CENTRE_TIME, HORIZON_TIME } from './fall';
import { MOMENTS, PHASE_RANGES, PHASE_STARTS, phaseIdAt } from './phases';

describe('phases', () => {
  it('splits the fall at the spec radii', () => {
    expect(PHASE_STARTS.plunge).toBeCloseTo(408.7, 0);
    expect(PHASE_STARTS.noOrbit).toBeCloseTo(555.9, 0);
    expect(PHASE_STARTS.lightRing).toBeCloseTo(685.9, 0);
    expect(PHASE_STARTS.inside).toBe(HORIZON_TIME);
    expect(PHASE_RANGES.inside.end).toBe(CENTRE_TIME);
    expect(PHASE_RANGES.letGo.end).toBe(PHASE_STARTS.plunge);
  });

  it('names the phase at a time', () => {
    expect(phaseIdAt(0)).toBe('letGo');
    expect(phaseIdAt(500)).toBe('plunge');
    expect(phaseIdAt(600)).toBe('noOrbit');
    expect(phaseIdAt(700)).toBe('lightRing');
    expect(phaseIdAt(HORIZON_TIME)).toBe('inside');
    expect(phaseIdAt(CENTRE_TIME)).toBe('inside');
  });

  it('places the moments', () => {
    expect(MOMENTS.lastOrbit).toBe(PHASE_STARTS.noOrbit);
    expect(MOMENTS.lightRing).toBe(PHASE_STARTS.lightRing);
    expect(MOMENTS.horizon).toBeCloseTo(HORIZON_TIME - 3, 5);
  });
});
