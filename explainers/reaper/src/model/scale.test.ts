import { describe, expect, it } from 'vitest';
import { aircraftUnits, metresToFeet, metresToUnits, unitsToMetres } from './scale';

describe('scale', () => {
  it('draws the world at twenty metres per unit', () => {
    expect(metresToUnits(7600)).toBe(380);
    expect(unitsToMetres(380)).toBe(7600);
  });

  it('draws the aircraft twenty times larger than the ground', () => {
    expect(aircraftUnits(20.1) / metresToUnits(20.1)).toBe(20);
  });

  it('converts metres to feet for the altitude readout', () => {
    expect(metresToFeet(7620)).toBeCloseTo(25000, 0);
  });
});
