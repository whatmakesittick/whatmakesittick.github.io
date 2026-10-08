import { describe, expect, it } from 'vitest';
import { MAX_RPM } from './constants';
import { builtHectares, farmRatedMw, projectKm2, sweptPitches, turnSeconds } from './scale';

describe('scale', () => {
  it('sweeps about 2.47 football pitches with one rotor', () => {
    expect(sweptPitches()).toBeCloseTo(2.47, 2);
  });

  it('rates the 27 turbines at 113.4 MW', () => {
    expect(farmRatedMw()).toBeCloseTo(113.4, 9);
  });

  it('builds on about 34 ha inside a 38.6 km² project area', () => {
    expect(builtHectares()).toBeCloseTo(34, 0);
    expect(projectKm2()).toBeCloseTo(38.6, 1);
  });

  it('turns the rotor once every 5.8 s at full speed', () => {
    expect(turnSeconds(MAX_RPM)).toBeCloseTo(5.8, 1);
    expect(turnSeconds(6)).toBe(10);
  });

  it('never completes a turn while the rotor stands still', () => {
    expect(turnSeconds(0)).toBe(Infinity);
    expect(turnSeconds(-1)).toBe(Infinity);
  });
});
