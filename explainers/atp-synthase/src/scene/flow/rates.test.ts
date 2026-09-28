import { describe, expect, it } from 'vitest';
import { FULL_TURN_DEG, HUMAN_BLADE_COUNT } from '../../model/rotor';
import { PUMP_IDS } from '../../model/scale';
import { electronPeriodDeg, oxygenPeriodDeg, pumpPeriodDeg } from './rates';

function perLap(periodDeg: number): number {
  return FULL_TURN_DEG / periodDeg;
}

describe('flow rates', () => {
  it('pumps out as many protons a lap as the ring lets back in', () => {
    const pumped = PUMP_IDS.reduce(
      (sum, pump) => sum + perLap(pumpPeriodDeg(pump, HUMAN_BLADE_COUNT)),
      0,
    );
    expect(pumped).toBeCloseTo(HUMAN_BLADE_COUNT);
  });

  it('splits the pumping four, four and two between the complexes', () => {
    expect(perLap(pumpPeriodDeg('complexOne', 10))).toBeCloseTo(4);
    expect(perLap(pumpPeriodDeg('complexThree', 10))).toBeCloseTo(4);
    expect(perLap(pumpPeriodDeg('complexFour', 10))).toBeCloseTo(2);
  });

  it('sends two electrons for every ten protons and uses one oxygen for four electrons', () => {
    expect(perLap(electronPeriodDeg(10))).toBeCloseTo(2);
    expect(perLap(oxygenPeriodDeg(10))).toBeCloseTo(0.5);
  });
});
