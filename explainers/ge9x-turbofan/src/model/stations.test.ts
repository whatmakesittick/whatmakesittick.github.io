import { describe, expect, it } from 'vitest';
import { PHASE_IDS } from '../ids';
import {
  CYCLE_UNITS,
  MOMENTS,
  PHASE_AXIAL,
  PHASE_RANGES,
  axialAt,
  metresAt,
  phaseIdAt,
  rate,
  secondsPerLoop,
  unitsAt,
} from './stations';
import { ENGINE_LENGTH_M } from './scale';

describe('stations', () => {
  it('covers the cycle with touching phases', () => {
    expect(PHASE_RANGES.suck.start).toBe(0);
    expect(PHASE_RANGES.blow.end).toBe(CYCLE_UNITS);
    PHASE_IDS.slice(1).forEach((id, index) =>
      expect(PHASE_RANGES[id].start).toBe(PHASE_RANGES[PHASE_IDS[index]].end),
    );
  });

  it('maps units to the axial fraction through the phase edges', () => {
    PHASE_IDS.forEach((id) => {
      expect(axialAt(PHASE_RANGES[id].start)).toBeCloseTo(PHASE_AXIAL[id].start);
    });
    expect(axialAt(CYCLE_UNITS)).toBeCloseTo(1);
    expect(metresAt(CYCLE_UNITS)).toBeCloseTo(ENGINE_LENGTH_M);
  });

  it('inverts the map', () => {
    [0, 75, 300, 500, 700, 900].forEach((units) =>
      expect(unitsAt(axialAt(units))).toBeCloseTo(units),
    );
  });

  it('finds the phase at every moment', () => {
    expect(phaseIdAt(MOMENTS.intake)).toBe('suck');
    expect(phaseIdAt(MOMENTS.behindFan)).toBe('squeeze');
    expect(phaseIdAt(MOMENTS.compressorExit)).toBe('burn');
    expect(phaseIdAt(MOMENTS.combustorExit)).toBe('spin');
    expect(phaseIdAt(MOMENTS.turbinesExit)).toBe('blow');
  });

  it('takes 12.5 seconds a loop at model pace', () => {
    expect(rate(1)).toBe(80);
    expect(secondsPerLoop(1)).toBeCloseTo(12.5);
  });
});
