import { describe, expect, it } from 'vitest';
import {
  BOOST_SECONDS,
  RAMP_ENTRY_SPEED_MS,
  RUN_BOOST_N,
  boostAccel,
  boostLastsSeconds,
  zeroToSixtySeconds,
} from './boost';

describe('boost', () => {
  it('pushes the run with 9.07 kN, 2,267 N a rear nozzle, to 16 m/s at the ramp', () => {
    expect(RUN_BOOST_N).toBeCloseTo(9067, 0);
    expect(RUN_BOOST_N / 4).toBeCloseTo(2267, 0);
    expect(RAMP_ENTRY_SPEED_MS).toBe(16);
    expect(boostAccel(RUN_BOOST_N) * BOOST_SECONDS).toBeCloseTo(RAMP_ENTRY_SPEED_MS, 9);
  });

  it('empties 600 L of air in 2.7 s at the full 80 kN', () => {
    expect(Math.floor(boostLastsSeconds(80000, 'air', 600) * 10) / 10).toBe(2.7);
  });

  it('needs about 77 kN for a 0.59 s sprint to 60 mph', () => {
    expect(zeroToSixtySeconds(77000)).toBeCloseTo(0.59, 2);
  });
});
