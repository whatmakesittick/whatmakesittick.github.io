import { describe, expect, it } from 'vitest';
import { toDegrees } from '@core/math';
import {
  NOZZLE_AREA,
  RESISTANCE_KEYS_KN,
  STEER_MAX,
  TOP_FLOW,
  helmNozzle,
  idealEfficiency,
  jetAt,
  knotsAtThrottle,
  resistanceAt,
  steadyFlowAt,
  steadyJetSpeedAt,
  throttleAt,
} from './jet';
import { knotsToMs } from './scale';

describe('waterjet model', () => {
  it('takes the drag at cruise and top speed from the facts sheet', () => {
    expect(resistanceAt(22)).toBe(1650);
    expect(resistanceAt(42)).toBe(2300);
    RESISTANCE_KEYS_KN.slice(1).forEach(([, kn], index) => {
      expect(kn).toBeGreaterThanOrEqual(RESISTANCE_KEYS_KN[index][1]);
    });
  });

  it('reproduces the facts sheet jet at 42 kn', () => {
    expect(NOZZLE_AREA).toBe(0.0064);
    expect(TOP_FLOW).toBeCloseTo(213, 0);
    expect(steadyJetSpeedAt(42)).toBeCloseTo(32.4, 1);
    const top = jetAt(1, 42, 0, false);
    expect(top.thrust).toBeCloseTo(2300, 6);
    expect(top.efficiency).toBeCloseTo(0.8, 2);
  });

  it('balances thrust and drag at every steady speed', () => {
    [4, 5.7, 11, 15, 22, 30].forEach((knots) => {
      const jet = jetAt(throttleAt(knots), knots, 0, false);
      expect(jet.thrust).toBeCloseTo(resistanceAt(knots), 6);
      expect(jet.flow).toBeCloseTo(steadyFlowAt(knots), 6);
    });
  });

  it('maps throttle to speed and back', () => {
    expect(throttleAt(0)).toBe(0);
    expect(throttleAt(42)).toBe(1);
    expect(throttleAt(22)).toBeCloseTo(0.694, 2);
    expect(throttleAt(11)).toBeCloseTo(0.554, 2);
    [0.2, 0.5, 0.694, 0.9].forEach((share) => {
      expect(throttleAt(knotsAtThrottle(share))).toBeCloseTo(share, 6);
    });
    for (let knots = 1; knots <= 42; knots += 1) {
      expect(throttleAt(knots)).toBeGreaterThan(throttleAt(knots - 1));
    }
  });

  it('is poor at low speed and good at high speed', () => {
    expect(jetAt(throttleAt(5.7), 5.7, 0, false).efficiency).toBeLessThan(0.5);
    expect(jetAt(throttleAt(22), 22, 0, false).efficiency).toBeCloseTo(0.67, 2);
    expect(idealEfficiency(10, 0)).toBe(0);
    expect(idealEfficiency(2 * knotsToMs(20), knotsToMs(20))).toBeCloseTo(2 / 3, 9);
  });

  it('steers 27 degrees each way and drops the bucket in reverse', () => {
    expect(toDegrees(STEER_MAX)).toBeCloseTo(27, 9);
    expect(helmNozzle('left')).toBe(-STEER_MAX);
    expect(helmNozzle('right')).toBe(STEER_MAX);
    expect(helmNozzle('straight')).toBe(0);
    const reverse = jetAt(0.5, 0, helmNozzle('reverse'), true);
    expect(reverse.bucket).toBe(1);
    expect(reverse.thrust).toBe(0);
    expect(reverse.efficiency).toBe(0);
    expect(reverse.flow).toBeCloseTo(0.5 * TOP_FLOW, 9);
    expect(jetAt(1, 42, 1, false).nozzleAngle).toBe(STEER_MAX);
  });
});
