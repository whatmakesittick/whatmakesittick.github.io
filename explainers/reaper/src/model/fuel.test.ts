import { describe, expect, it } from 'vitest';
import { MISSION_UNITS, PHASE_RANGES, unitsAt } from './mission';
import {
  CRUISE_TO_LOITER_BURN,
  FUEL_KG,
  FULL_POWER_BURN_KG_PER_H,
  burnRate,
  fuelAt,
  fuelUsedKg,
  loiterBurn,
} from './fuel';

describe('fuel', () => {
  it('starts with about 1,800 kg in the tanks', () => {
    expect(fuelAt(0, 'armed')).toEqual({ kg: FUEL_KG, share: 1 });
    expect(FUEL_KG).toBe(1814);
  });

  it('burns 228 kg an hour at full power and loiters on what the endurance allows', () => {
    expect(burnRate('fullPower', 'armed')).toBe(FULL_POWER_BURN_KG_PER_H);
    expect(loiterBurn('clean')).toBeCloseTo(67.2, 1);
    expect(loiterBurn('armed')).toBeCloseTo(129.6, 1);
    expect(burnRate('cruise', 'armed')).toBeCloseTo(CRUISE_TO_LOITER_BURN * 129.57, 1);
  });

  it('burns 76 kg in the first 20 minutes at full power', () => {
    expect(fuelUsedKg(20, 'armed')).toBeCloseTo(76, 6);
    expect(fuelUsedKg(20, 'clean')).toBeCloseTo(76, 6);
  });

  it('lands the armed mission with fuel to spare', () => {
    const left = fuelAt(MISSION_UNITS, 'armed');
    expect(left.kg).toBeGreaterThan(0);
    expect(left.kg).toBeCloseTo(293, 0);
    expect(left.share).toBeCloseTo(left.kg / FUEL_KG, 9);
  });

  it('leaves more fuel flying clean than armed', () => {
    const clean = fuelAt(MISSION_UNITS, 'clean').kg;
    expect(clean).toBeGreaterThan(fuelAt(MISSION_UNITS, 'armed').kg);
    expect(clean).toBeCloseTo(988, 0);
  });

  it('only ever goes down', () => {
    let previous = FUEL_KG;
    for (let units = 0; units <= MISSION_UNITS; units += 0.5) {
      const { kg } = fuelAt(units, 'armed');
      expect(kg).toBeLessThanOrEqual(previous);
      previous = kg;
    }
  });

  it('burns at the loiter rate on station', () => {
    const start = fuelAt(PHASE_RANGES.loiter.start, 'armed').kg;
    const hourLater = fuelAt(unitsAt(90 + 60), 'armed').kg;
    expect(start - hourLater).toBeCloseTo(loiterBurn('armed'), 6);
  });
});
