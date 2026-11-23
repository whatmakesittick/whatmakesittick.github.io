import { describe, expect, it } from 'vitest';
import { STEP_RATE_RANGE, stepRateEffect } from './stepRate';

describe('step rate effect', () => {
  it('changes nothing at the preferred rate', () => {
    const effect = stepRateEffect(0);
    expect(effect.kneeLandDeg).toBe(0);
    expect(effect.kneePeakDeg).toBe(0);
    expect(effect.hipPeakDeg).toBe(0);
    expect(effect.reachCm).toBe(0);
    expect(effect.bounceFactor).toBe(1);
    expect(effect.brakingImpulseFactor).toBe(1);
    expect(effect.kneeEnergyFactor).toBe(1);
    expect(effect.verticalForceFactor).toBe(1);
  });

  it('reproduces the sourced rows at the ends', () => {
    const quick = stepRateEffect(10);
    expect(quick.kneeLandDeg).toBeCloseTo(1.8, 6);
    expect(quick.kneePeakDeg).toBeCloseTo(-3.5, 6);
    expect(quick.hipPeakDeg).toBeCloseTo(-3.1, 6);
    expect(quick.reachCm).toBeCloseTo(-2.2, 6);
    expect(quick.bounceFactor).toBeCloseTo(0.839, 3);
    expect(quick.brakingImpulseFactor).toBeCloseTo(0.839, 3);
    expect(quick.kneeEnergyFactor).toBeCloseTo(0.663, 3);
    expect(quick.verticalForceFactor).toBeCloseTo(0.975, 3);
    const slow = stepRateEffect(-10);
    expect(slow.reachCm).toBeCloseTo(2.2, 6);
    expect(slow.brakingImpulseFactor).toBeCloseTo(1.25, 2);
    expect(slow.kneeEnergyFactor).toBeCloseTo(1.467, 3);
  });

  it('interpolates linearly between the sourced rows', () => {
    const mid = stepRateEffect(2.5);
    const five = stepRateEffect(5);
    const zero = stepRateEffect(0);
    expect(mid.kneePeakDeg).toBeCloseTo((five.kneePeakDeg + zero.kneePeakDeg) / 2, 9);
    expect(stepRateEffect(5).reachCm).toBeCloseTo(-1.4, 6);
    expect(stepRateEffect(-5).reachCm).toBeCloseTo(1.0, 6);
  });

  it('clamps to the range', () => {
    expect(stepRateEffect(40)).toEqual(stepRateEffect(STEP_RATE_RANGE.max));
    expect(stepRateEffect(-40)).toEqual(stepRateEffect(STEP_RATE_RANGE.min));
  });
});
