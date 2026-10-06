import { describe, expect, it } from 'vitest';
import {
  BODY_K,
  EARTH_UT,
  GAMMA_MHZ_PER_T,
  HELIUM_K,
  KELVIN_AT_ZERO_CELSIUS,
  MODEL_SIZE,
  REAL_LINES,
} from './constants';

describe('constants', () => {
  it('takes the gyromagnetic ratio of hydrogen from the facts sheet', () => {
    expect(GAMMA_MHZ_PER_T).toBeCloseTo(42.58, 2);
  });

  it('puts the body at 37 °C and liquid helium at about −269 °C', () => {
    expect(BODY_K - KELVIN_AT_ZERO_CELSIUS).toBeCloseTo(37, 9);
    expect(HELIUM_K - KELVIN_AT_ZERO_CELSIUS).toBeCloseTo(-268.95, 2);
  });

  it('keeps the Earth field band and the picture sizes', () => {
    expect(EARTH_UT).toEqual({ min: 25, typical: 50, max: 65 });
    expect(REAL_LINES).toBe(256);
    expect(MODEL_SIZE).toBe(64);
  });
});
