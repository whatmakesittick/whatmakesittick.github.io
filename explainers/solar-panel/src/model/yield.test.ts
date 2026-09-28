import { describe, expect, it } from 'vitest';
import { DAY_CYCLE_MIN, SUN_MOMENTS } from './day';
import { acEnergyWh } from './power';
import { clearDayPowerW, dailyEnergyWh, energySoFarWh, fridgeDays, laptopCharges } from './yield';

describe('energy over the day', () => {
  it('gives about 375 W at the equinox noon with the mild spring air', () => {
    expect(clearDayPowerW(720, 35)).toBeCloseTo(375, -0.5);
    expect(clearDayPowerW(330, 35)).toBe(0);
  });

  it('adds up to about 2.7 kWh on the 35° roof, 2.2 flat and 2.0 upright (facts section 5)', () => {
    expect(dailyEnergyWh(35)).toBeGreaterThan(2650);
    expect(dailyEnergyWh(35)).toBeLessThan(2780);
    expect(dailyEnergyWh(0)).toBeGreaterThan(2150);
    expect(dailyEnergyWh(0)).toBeLessThan(2250);
    expect(dailyEnergyWh(90)).toBeGreaterThan(1930);
    expect(dailyEnergyWh(90)).toBeLessThan(2010);
  });

  it('peaks at a tilt equal to the latitude on the equinox (facts section 5)', () => {
    expect(dailyEnergyWh(40)).toBeGreaterThan(dailyEnergyWh(35));
    expect(dailyEnergyWh(40)).toBeGreaterThan(dailyEnergyWh(45));
    expect(dailyEnergyWh(35) / dailyEnergyWh(40)).toBeGreaterThan(0.99);
  });

  it('counts nothing before sunrise, half by noon and all by dusk', () => {
    expect(energySoFarWh(SUN_MOMENTS.sunrise - 40, 35)).toBe(0);
    expect(energySoFarWh(SUN_MOMENTS.noon, 35) / dailyEnergyWh(35)).toBeCloseTo(0.5, 2);
    expect(energySoFarWh(DAY_CYCLE_MIN, 35)).toBe(dailyEnergyWh(35));
    expect(energySoFarWh(DAY_CYCLE_MIN + 10, 35)).toBe(dailyEnergyWh(35));
  });

  it('rises between whole minutes', () => {
    const before = energySoFarWh(400, 35);
    const after = energySoFarWh(401, 35);
    expect(energySoFarWh(400.5, 35)).toBeCloseTo((before + after) / 2, 6);
  });

  it('turns 2.28 kWh into about 42 laptop charges or 1.8 fridge days (facts section 9)', () => {
    expect(laptopCharges(2280)).toBeCloseTo(42.4, 1);
    expect(fridgeDays(2280)).toBeCloseTo(1.82, 2);
  });

  it('ends a clear day on the 35° roof at about 50 laptop charges after the inverter', () => {
    expect(Math.round(laptopCharges(acEnergyWh(dailyEnergyWh(35))))).toBe(49);
  });
});
