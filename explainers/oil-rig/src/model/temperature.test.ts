import { describe, expect, it } from 'vitest';
import {
  OIL_WINDOW_C,
  SEABED_TEMPERATURE_C,
  rockTemperatureC,
  seaTemperatureC,
  temperatureAtC,
} from './temperature';
import { fluidLeg } from './rocks';
import { SEABED_DEPTH_M, WATER_DEPTH_M } from './wellPlan';

describe('temperature', () => {
  it('cools from about 18 °C at the surface to 4 °C at 1,000 m of water', () => {
    expect(seaTemperatureC(0)).toBeCloseTo(18);
    expect(seaTemperatureC(WATER_DEPTH_M)).toBeCloseTo(4);
    for (let depth = 0; depth < WATER_DEPTH_M; depth += 50) {
      expect(seaTemperatureC(depth + 50)).toBeLessThan(seaTemperatureC(depth));
    }
  });

  it('warms 30 °C per km below the seabed', () => {
    expect(rockTemperatureC(SEABED_DEPTH_M)).toBe(SEABED_TEMPERATURE_C);
    expect(rockTemperatureC(SEABED_DEPTH_M + 1000)).toBeCloseTo(34);
  });

  it('puts the top of the oil leg near 95 °C and the source rock near 117 °C, inside the oil window', () => {
    const oil = fluidLeg('oil');
    const oilTop = oil.top;
    expect(rockTemperatureC(oilTop)).toBeCloseTo(95, 0);
    expect(rockTemperatureC((oilTop + oil.bottom) / 2)).toBeLessThan(98);
    expect(rockTemperatureC(4800)).toBeCloseTo(117, 0);
    expect(rockTemperatureC(4800)).toBeLessThan(OIL_WINDOW_C.max);
    expect(rockTemperatureC(oilTop)).toBeGreaterThan(OIL_WINDOW_C.min);
  });

  it('reads the sea above the seabed and the rock below it', () => {
    expect(temperatureAtC(0)).toBeCloseTo(18);
    expect(temperatureAtC(SEABED_DEPTH_M)).toBeCloseTo(4);
    expect(temperatureAtC(SEABED_DEPTH_M + 500)).toBeCloseTo(19);
  });
});
