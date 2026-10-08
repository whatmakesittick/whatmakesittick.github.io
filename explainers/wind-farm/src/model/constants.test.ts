import { describe, expect, it } from 'vitest';
import {
  BETZ_LIMIT,
  CUT_IN_MS,
  CUT_OUT_MS,
  FARM_RATED_KW,
  RAMP_START_MS,
  RATED_WIND_MS,
  RESTART_MS,
  ROTOR_RADIUS_M,
  TIP_HEIGHT_M,
  TURBINE_COUNT,
} from './constants';

describe('constants', () => {
  it('puts the blade tip 180 m above the ground', () => {
    expect(ROTOR_RADIUS_M).toBe(75);
    expect(TIP_HEIGHT_M).toBe(180);
  });

  it('rates the 27 turbine farm at 113,400 kW', () => {
    expect(TURBINE_COUNT).toBe(27);
    expect(FARM_RATED_KW).toBe(113_400);
  });

  it('caps the share of wind power at the Betz limit of 0.593', () => {
    expect(BETZ_LIMIT).toBeCloseTo(0.593, 3);
  });

  it('orders the wind thresholds from cut-in to cut-out', () => {
    expect(CUT_IN_MS).toBeLessThan(RATED_WIND_MS);
    expect(RATED_WIND_MS).toBeLessThan(RAMP_START_MS);
    expect(RAMP_START_MS).toBeLessThan(RESTART_MS);
    expect(RESTART_MS).toBeLessThan(CUT_OUT_MS);
  });
});
