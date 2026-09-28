import { describe, expect, it } from 'vitest';
import {
  RESERVE_AFTER_A_DAY_HOURS,
  amplitude,
  averagePowerMicroW,
  storedEnergyJ,
  torqueMNm,
} from './mainspring';
import { MAINSPRING_TORQUE_MNM, POWER_RESERVE_HOURS } from './train';

describe('mainspring torque', () => {
  it('runs through the full wind, one day later and the run-down torque', () => {
    expect(torqueMNm(POWER_RESERVE_HOURS)).toBeCloseTo(MAINSPRING_TORQUE_MNM.fullWind);
    expect(torqueMNm(RESERVE_AFTER_A_DAY_HOURS)).toBeCloseTo(MAINSPRING_TORQUE_MNM.after24Hours);
    expect(torqueMNm(0)).toBeCloseTo(MAINSPRING_TORQUE_MNM.runDown);
  });

  it('falls in a straight line between those points', () => {
    expect(torqueMNm(30)).toBeCloseTo((11.3 + 9.1) / 2);
    expect(torqueMNm(9)).toBeCloseTo((9.1 + 5.0) / 2);
  });

  it('stays at the end values outside the reserve', () => {
    expect(torqueMNm(60)).toBeCloseTo(MAINSPRING_TORQUE_MNM.fullWind);
    expect(torqueMNm(-5)).toBeCloseTo(MAINSPRING_TORQUE_MNM.runDown);
  });

  it('drops about 19 percent in the first day', () => {
    const drop = 1 - torqueMNm(RESERVE_AFTER_A_DAY_HOURS) / torqueMNm(POWER_RESERVE_HOURS);
    expect(drop).toBeCloseTo(0.19, 2);
  });
});

describe('balance amplitude', () => {
  it('swings 280° at full wind', () => {
    expect(amplitude(POWER_RESERVE_HOURS)).toBeCloseTo(280);
  });

  it('falls to about 251° after a day and about 186° when run down', () => {
    expect(amplitude(RESERVE_AFTER_A_DAY_HOURS)).toBeCloseTo(251.3, 1);
    expect(amplitude(0)).toBeCloseTo(186.3, 1);
  });
});

describe('stored energy', () => {
  it('holds nothing when run down', () => {
    expect(storedEnergyJ(0)).toBe(0);
  });

  it('integrates the torque over the 5.25 arbor turns of a full wind', () => {
    const torqueHours = ((5.0 + 9.1) / 2) * 18 + ((9.1 + 11.3) / 2) * 24;
    const radiansPerHour = (2 * Math.PI) / 8;
    expect(storedEnergyJ(POWER_RESERVE_HOURS)).toBeCloseTo(torqueHours * radiansPerHour * 1e-3, 6);
  });

  it('stores about a third of a joule when full', () => {
    expect(storedEnergyJ(POWER_RESERVE_HOURS)).toBeGreaterThan(0.28);
    expect(storedEnergyJ(POWER_RESERVE_HOURS)).toBeLessThan(0.34);
  });

  it('grows with every hour of reserve', () => {
    expect(storedEnergyJ(10)).toBeLessThan(storedEnergyJ(20));
    expect(storedEnergyJ(20)).toBeLessThan(storedEnergyJ(40));
  });

  it('runs the watch on about 2 microwatts', () => {
    expect(averagePowerMicroW()).toBeGreaterThan(1.8);
    expect(averagePowerMicroW()).toBeLessThan(2.2);
  });
});
