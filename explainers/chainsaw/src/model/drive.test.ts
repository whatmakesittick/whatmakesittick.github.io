import { describe, expect, it } from 'vitest';
import { toRadians } from '@core/math';
import { ENGAGE_RPM, IDLE_RPM, MAX_POWER_RPM, SPROCKET_TEETH } from './constants';
import {
  CHAIN_LOOP_MM,
  CHAIN_MM_PER_TURN,
  MAX_CHAIN_SPEED_MS,
  THROTTLE_PRESETS,
  chainSpeedMs,
  chainTravelMm,
  clutchOf,
  engineRpm,
  FAST_IDLE_RPM,
  cuttersPerSecond,
  drumDegrees,
  kmh,
  oiling,
  rpmOf,
  shoesOut,
  snapThrottle,
  strokesPerSecond,
  throttleOf,
  turnMs,
  wrapChain,
} from './drive';

describe('throttle and engine speed', () => {
  it('runs from idle at 2,700 to max power at 9,900 rpm in a straight line', () => {
    expect(rpmOf(0)).toBe(IDLE_RPM);
    expect(rpmOf(1)).toBe(MAX_POWER_RPM);
    expect(rpmOf(THROTTLE_PRESETS.half)).toBe(6300);
    expect(throttleOf(rpmOf(0.37))).toBeCloseTo(0.37, 9);
  });

  it('snaps the throttle to whole percent and clamps it', () => {
    expect(snapThrottle(0.374)).toBe(0.37);
    expect(snapThrottle(1.4)).toBe(1);
    expect(snapThrottle(-0.2)).toBe(0);
  });

  it('takes 6.1 ms a turn and 165 power strokes a second at max power', () => {
    expect(turnMs(MAX_POWER_RPM)).toBeCloseTo(6.06, 2);
    expect(turnMs(IDLE_RPM)).toBeCloseTo(22.2, 1);
    expect(strokesPerSecond(MAX_POWER_RPM)).toBe(165);
  });
});

describe('engine state', () => {
  it('turns no rpm while stopped or cranking, fast idle above engagement, throttle when running', () => {
    expect(engineRpm('stopped', 1)).toBe(0);
    expect(engineRpm('cranking', 1)).toBe(0);
    expect(engineRpm('fastIdle', 0)).toBe(FAST_IDLE_RPM);
    expect(FAST_IDLE_RPM).toBeGreaterThan(ENGAGE_RPM);
    expect(engineRpm('running', 0)).toBe(IDLE_RPM);
    expect(clutchOf(engineRpm('stopped', 1), false)).toBe('open');
    expect(clutchOf(engineRpm('fastIdle', 0), true)).toBe('slipping');
  });
});

describe('clutch', () => {
  it('stays open below 3,700 rpm, drives above it and slips against the brake', () => {
    expect(clutchOf(IDLE_RPM, false)).toBe('open');
    expect(clutchOf(ENGAGE_RPM - 1, false)).toBe('open');
    expect(clutchOf(ENGAGE_RPM, false)).toBe('driving');
    expect(clutchOf(MAX_POWER_RPM, true)).toBe('slipping');
    expect(clutchOf(IDLE_RPM, true)).toBe('open');
  });

  it('throws the shoes out between idle and engagement', () => {
    expect(shoesOut(IDLE_RPM)).toBe(0);
    expect(shoesOut(ENGAGE_RPM)).toBe(1);
  });
});

describe('chain', () => {
  it('moves two pitches per sprocket tooth', () => {
    expect(CHAIN_MM_PER_TURN).toBeCloseTo(133.35, 9);
    expect(CHAIN_LOOP_MM).toBeCloseTo(1047.75, 9);
  });

  it('runs at 22.0 m/s at max power, about 79 km/h', () => {
    expect(MAX_CHAIN_SPEED_MS).toBeCloseTo(22.0, 1);
    expect(kmh(MAX_CHAIN_SPEED_MS)).toBeCloseTo(79.2, 0);
  });

  it('stands still while the clutch is open or slipping, then jumps to 8.2 m/s', () => {
    expect(chainSpeedMs(IDLE_RPM, clutchOf(IDLE_RPM, false))).toBe(0);
    expect(chainSpeedMs(MAX_POWER_RPM, 'slipping')).toBe(0);
    expect(chainSpeedMs(ENGAGE_RPM, clutchOf(ENGAGE_RPM, false))).toBeCloseTo(8.2, 1);
  });

  it('passes about 570 cutters a second at max power', () => {
    expect(cuttersPerSecond(MAX_CHAIN_SPEED_MS)).toBeCloseTo(567, 0);
  });

  it('follows the crank only while driving', () => {
    expect(chainTravelMm(360, 'driving')).toBeCloseTo(CHAIN_MM_PER_TURN, 9);
    expect(chainTravelMm(-180, 'driving')).toBeCloseTo(-CHAIN_MM_PER_TURN / 2, 9);
    expect(chainTravelMm(360, 'open')).toBe(0);
  });

  it('wraps the chain round its loop and turns the drum with it', () => {
    expect(wrapChain(-1)).toBeCloseTo(CHAIN_LOOP_MM - 1, 9);
    expect(drumDegrees(CHAIN_MM_PER_TURN / 4)).toBeCloseTo(90, 9);
    expect(Math.cos(toRadians(drumDegrees(CHAIN_MM_PER_TURN)))).toBeCloseTo(1, 9);
  });

  it('jumps the drum by whole sprocket teeth when the chain wraps', () => {
    const jump = drumDegrees(CHAIN_LOOP_MM - 0.001) - drumDegrees(0);
    const tooth = 360 / SPROCKET_TEETH;
    expect(Math.abs(jump / tooth - Math.round(jump / tooth))).toBeLessThan(0.001);
  });

  it('oils the bar only while the chain is driven', () => {
    expect(oiling('driving')).toBe(true);
    expect(oiling('open')).toBe(false);
    expect(oiling('slipping')).toBe(false);
  });
});
