import { describe, expect, it } from 'vitest';
import { GAS_IDS } from '../ids';
import { PLUME_COLOURS } from '../theme';
import { CORNER_NOZZLE_MAX_N, ROLL_NOZZLE_N } from './constants';
import { PLUME_LENGTH_M, plumeLength, plumeStyle } from './plume';

describe('plume', () => {
  it('reaches 1.5 m from a corner nozzle at full thrust and nothing when shut', () => {
    expect(plumeLength(CORNER_NOZZLE_MAX_N, 'air')).toBe(PLUME_LENGTH_M);
    expect(plumeLength(ROLL_NOZZLE_N, 'air')).toBeCloseTo(0.375, 9);
    expect(plumeLength(0, 'helium')).toBe(0);
  });

  it('draws air and nitrogen as the same white condensation cloud', () => {
    expect(plumeStyle('nitrogen')).toEqual(plumeStyle('air'));
    expect(plumeStyle('air')).toMatchObject({ lengthScale: 1, colour: PLUME_COLOURS.air });
    expect(plumeLength(CORNER_NOZZLE_MAX_N, 'nitrogen')).toBe(PLUME_LENGTH_M);
  });

  it('draws helium longer, pale blue and thinner', () => {
    const helium = plumeStyle('helium');
    expect(helium).toMatchObject({ lengthScale: 1.6, colour: PLUME_COLOURS.helium });
    expect(helium.opacity).toBeLessThan(plumeStyle('air').opacity);
    expect(plumeLength(CORNER_NOZZLE_MAX_N, 'helium')).toBeCloseTo(2.4, 9);
  });

  it('keeps every opacity visible', () => {
    GAS_IDS.forEach((gas) => {
      expect(plumeStyle(gas).opacity, gas).toBeGreaterThan(0);
      expect(plumeStyle(gas).opacity, gas).toBeLessThanOrEqual(1);
    });
  });
});
