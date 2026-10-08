import { describe, expect, it } from 'vitest';
import { FARM_RATED_KW } from './constants';
import { operatingAt, parkedWindow } from './control';
import { CYCLE_MINUTES, dayWind, windFromDeg } from './day';
import {
  annualHomesPerTurbine,
  dayCapacityFactor,
  dayEnergyMwh,
  energyTable,
  energyTodayMwh,
  homesNow,
} from './energy';
import { farmPowerKw } from './wakes';

const SAMPLE_COUNT = 289;
const NOON = 720;

describe('energyTable', () => {
  it('samples the farm every 5 minutes through the whole day', () => {
    const table = energyTable('typical', 7);
    expect(table.stepMinutes).toBe(5);
    expect(table.farmKw).toHaveLength(SAMPLE_COUNT);
    expect(table.cumulativeMwh).toHaveLength(SAMPLE_COUNT);
    expect(table.cumulativeMwh[0]).toBe(0);
  });

  it('reuses the table for the same site and spacing', () => {
    expect(energyTable('typical', 7)).toBe(energyTable('typical', 7));
    expect(energyTable('typical', 7)).not.toBe(energyTable('typical', 9));
  });

  it('follows the waked farm while producing and drops to zero while parked', () => {
    const { farmKw } = energyTable('typical', 7);
    const noonSample = NOON / 5;
    expect(farmKw[noonSample]).toBeCloseTo(
      farmPowerKw(dayWind(NOON, 'typical'), windFromDeg(NOON), 7),
      9,
    );
    const { stop, restart } = parkedWindow('typical') ?? { stop: 0, restart: 0 };
    const parkedSample = Math.ceil((stop + restart) / 2 / 5) * 5;
    expect(operatingAt(parkedSample, 'typical').producing).toBe(false);
    expect(farmKw[parkedSample / 5]).toBe(0);
    expect(farmKw[0]).toBe(0);
  });

  it('never runs above the rated farm', () => {
    expect(Math.max(...energyTable('windy', 9).farmKw)).toBeLessThanOrEqual(FARM_RATED_KW);
  });
});

describe('energy today', () => {
  it('climbs through the day and ends on the day total', () => {
    const samples = [0, 300, 600, 900, 1200, 1435].map((minute) =>
      energyTodayMwh(minute, 'typical', 7),
    );
    samples
      .slice(1)
      .forEach((total, index) => expect(total).toBeGreaterThanOrEqual(samples[index]));
    expect(energyTodayMwh(0, 'typical', 7)).toBe(0);
    expect(dayEnergyMwh('typical', 7)).toBeCloseTo(1182.8, 1);
  });

  it('reads linearly between the samples', () => {
    const before = energyTodayMwh(NOON, 'typical', 7);
    const after = energyTodayMwh(NOON + 5, 'typical', 7);
    expect(energyTodayMwh(NOON + 2, 'typical', 7)).toBeCloseTo(
      before + ((after - before) * 2) / 5,
      9,
    );
  });

  it('starts over at midnight', () => {
    expect(energyTodayMwh(CYCLE_MINUTES, 'typical', 7)).toBe(0);
  });
});

describe('day capacity factor', () => {
  it('lands near 0.37, 0.43 and 0.46 for the calm, typical and windy sites', () => {
    expect(dayCapacityFactor('calm', 7)).toBeCloseTo(0.37, 2);
    expect(dayCapacityFactor('typical', 7)).toBeCloseTo(0.43, 2);
    expect(dayCapacityFactor('windy', 7)).toBeCloseTo(0.46, 2);
  });

  it('rises from the calm site to the windy one', () => {
    const calm = dayCapacityFactor('calm', 7);
    const typical = dayCapacityFactor('typical', 7);
    expect(typical).toBeGreaterThan(calm);
    expect(dayCapacityFactor('windy', 7)).toBeGreaterThan(typical);
  });
});

describe('homes', () => {
  it('counts one home for each 1.23 kW of output', () => {
    expect(homesNow(1.2318)).toBeCloseTo(1, 3);
    expect(homesNow(4200)).toBeCloseTo(3409.5, 1);
    expect(homesNow(0)).toBe(0);
  });

  it('supplies 1,361 full homes a year from one turbine', () => {
    expect(annualHomesPerTurbine()).toBeCloseTo(1361.5, 1);
    expect(Math.floor(annualHomesPerTurbine())).toBe(1361);
  });
});
