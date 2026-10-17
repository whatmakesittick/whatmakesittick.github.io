import { describe, expect, it } from 'vitest';
import { toDegrees } from '@core/math';
import { peakRollRate, rollAngleAt, rollSeconds, rollTorque } from './roll';

describe('roll', () => {
  it('makes 3.6 kN m from two 2 kN nozzles 0.9 m out', () => {
    expect(rollTorque(2000)).toBeCloseTo(3600, 9);
  });

  it('rolls half a turn in 1.32, 1.45 and 1.77 s at 500, 600 and 900 kg m2', () => {
    expect(rollSeconds(500, 2000)).toBeCloseTo(1.32, 2);
    expect(rollSeconds(600, 2000)).toBeCloseTo(1.45, 2);
    expect(rollSeconds(900, 2000)).toBeCloseTo(1.77, 2);
  });

  it('speeds up for the first half and brakes to a stop at half a turn', () => {
    const total = rollSeconds(600, 2000);
    expect(rollAngleAt(0, 600, 2000)).toBe(0);
    expect(rollAngleAt(total / 2, 600, 2000)).toBeCloseTo(Math.PI / 2, 9);
    expect(rollAngleAt(total, 600, 2000)).toBeCloseTo(Math.PI, 9);
    expect(rollAngleAt(total + 1, 600, 2000)).toBeCloseTo(Math.PI, 9);
    expect(rollAngleAt(-1, 600, 2000)).toBe(0);
  });

  it('peaks at about 250 degrees a second half way through', () => {
    expect(toDegrees(peakRollRate(600, 2000))).toBeCloseTo(249, 0);
  });
});
