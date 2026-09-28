import { describe, expect, it } from 'vitest';
import {
  acPowerW,
  cellTemperatureC,
  modulePowerW,
  temperatureFactor,
  thermalVoltageV,
  vocAt,
} from './power';

describe('module power', () => {
  it('warms the cells to about 50 °C in 973 W/m² of 15 °C air (facts section 5)', () => {
    expect(cellTemperatureC(15, 973)).toBeCloseTo(50.3, 1);
    expect(cellTemperatureC(15, 0)).toBe(15);
  });

  it('gives about 378 W at the equinox noon on the 35° roof (facts section 5)', () => {
    expect(modulePowerW(973, cellTemperatureC(15, 973))).toBeCloseTo(378, -0.5);
  });

  it('gives 420 W in test sun and loses 0.29 percent per °C (facts sections 1 and 6)', () => {
    expect(modulePowerW(1000, 25)).toBeCloseTo(420);
    expect(modulePowerW(1000, 50)).toBeCloseTo(389.55, 2);
    expect(modulePowerW(1000, 0)).toBeCloseTo(450.45, 2);
    expect(temperatureFactor(60)).toBeCloseTo(0.8985, 4);
  });

  it('makes nothing in the dark', () => {
    expect(modulePowerW(0, 20)).toBe(0);
    expect(vocAt(0, 20)).toBe(0);
  });

  it('matches the open-circuit voltage in test sun, warm and dim (facts sections 6 and 8)', () => {
    expect(thermalVoltageV(25)).toBeCloseTo(0.02569, 5);
    expect(vocAt(1000, 25)).toBeCloseTo(38.11, 2);
    expect(vocAt(1000, 50)).toBeCloseTo(35.73, 1);
    expect(vocAt(800, 25)).toBeCloseTo(37.81, 1);
    expect(vocAt(200, 25)).toBeCloseTo(35.88, 0);
  });

  it('loses 4 percent in the inverter', () => {
    expect(acPowerW(300)).toBeCloseTo(288);
    expect(acPowerW(-5)).toBe(0);
  });
});
