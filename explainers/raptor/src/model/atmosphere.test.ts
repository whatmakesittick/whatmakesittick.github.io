import { describe, expect, it } from 'vitest';
import {
  SEA_LEVEL_PRESSURE_PA,
  STANDARD_ATMOSPHERE,
  airPressure,
  airPressureBar,
} from './atmosphere';

describe('airPressure', () => {
  it('matches every row of the standard atmosphere', () => {
    STANDARD_ATMOSPHERE.forEach(([altitude, pressure]) => {
      expect(airPressure(altitude)).toBeCloseTo(pressure, 6);
    });
  });

  it('falls with height and keeps falling above the table', () => {
    let previous = airPressure(0);
    for (let km = 1; km <= 100; km += 1) {
      const pressure = airPressure(km);
      expect(pressure).toBeLessThan(previous);
      previous = pressure;
    }
    expect(airPressure(90)).toBeGreaterThan(0);
  });

  it('holds sea level below the ground', () => {
    expect(airPressure(-1)).toBeCloseTo(SEA_LEVEL_PRESSURE_PA, 6);
  });

  it('converts to bar', () => {
    expect(airPressureBar(0)).toBeCloseTo(1.01325, 6);
  });
});
