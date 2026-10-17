import { describe, expect, it } from 'vitest';
import { ENTRY_SPEED_MS, SIXTY_MPH_MS } from './constants';
import {
  SETTLE_DECEL,
  SETTLE_SECONDS,
  SPRINT_ACCEL,
  SPRINT_DISTANCE_M,
  SPRINT_SECONDS,
  SPRINT_THRUST_N,
  boostAccel,
  boostLastsSeconds,
  zeroToSixtySeconds,
} from './boost';
import { RAMP, SITE } from './layout';
import { G } from './constants';

describe('boost', () => {
  it('runs 0 to 60 mph in 0.81 s at 3.4 g on about 56 kN', () => {
    expect(zeroToSixtySeconds(SPRINT_THRUST_N)).toBeCloseTo(SPRINT_SECONDS, 9);
    expect(SPRINT_ACCEL / G).toBeCloseTo(3.4, 1);
    expect(SPRINT_THRUST_N / 1000).toBeCloseTo(56.3, 1);
    expect(SPRINT_DISTANCE_M).toBeCloseTo(SITE.finishLineX, 1);
  });

  it('brakes at about 4 m/s2 to reach the loop at 18 m/s', () => {
    expect(SETTLE_DECEL).toBeCloseTo(4.0, 1);
    expect(SPRINT_SECONDS + SETTLE_SECONDS).toBeCloseTo(3.0, 2);
    const settled = SIXTY_MPH_MS * SETTLE_SECONDS - 0.5 * SETTLE_DECEL * SETTLE_SECONDS ** 2;
    expect(SPRINT_DISTANCE_M + settled).toBeCloseTo(RAMP.entryX, 9);
    expect(SIXTY_MPH_MS - SETTLE_DECEL * SETTLE_SECONDS).toBeCloseTo(ENTRY_SPEED_MS, 9);
  });

  it('empties 600 L of air in 2.7 s at the full 80 kN', () => {
    expect(Math.floor(boostLastsSeconds(80000, 'air', 600) * 10) / 10).toBe(2.7);
    expect(boostAccel(17000)).toBe(10);
  });
});
