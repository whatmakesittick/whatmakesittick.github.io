import { describe, expect, it } from 'vitest';
import { toDegrees } from '@core/math';
import {
  FLOATING_BELOW_KN,
  HULL_SPEED_KN,
  PLANING_FROM_KN,
  TRANSOM_DEPTH_KEYS,
  TRIM_KEYS_DEG,
  WETTED_KEYS,
  heaveFor,
  liftShareAt,
  modeAt,
  planingAt,
  speedLengthRatio,
} from './hull';
import { BOAT } from './layout';

describe('hull model', () => {
  it('gives the 5.7 kn hull speed of a 5.5 m boat', () => {
    expect(HULL_SPEED_KN).toBe(5.7);
    expect(speedLengthRatio(HULL_SPEED_KN)).toBeCloseTo(1.34, 2);
  });

  it('floats below 6 kn, climbs the hump and planes from 16 kn', () => {
    expect(modeAt(0)).toBe('floating');
    expect(modeAt(FLOATING_BELOW_KN - 0.1)).toBe('floating');
    expect(modeAt(11)).toBe('hump');
    expect(modeAt(PLANING_FROM_KN)).toBe('planing');
    expect(modeAt(42)).toBe('planing');
    expect(PLANING_FROM_KN).toBeGreaterThanOrEqual(15);
    expect(PLANING_FROM_KN).toBeLessThanOrEqual(18);
  });

  it('takes trim and wetted length from 15 kn up from the facts sheet', () => {
    expect(toDegrees(planingAt(15).trim)).toBeCloseTo(4, 9);
    expect(toDegrees(planingAt(22).trim)).toBeCloseTo(4, 9);
    expect(toDegrees(planingAt(30).trim)).toBeCloseTo(3, 9);
    expect(toDegrees(planingAt(42).trim)).toBeCloseTo(2.5, 9);
    expect(planingAt(15).wettedLength).toBe(4.5);
    expect(planingAt(22).wettedLength).toBe(3.2);
    expect(planingAt(42).wettedLength).toBe(1.7);
  });

  it('lifts the bow most near the hump and settles to 3 to 4 degrees', () => {
    const peak = Math.max(...TRIM_KEYS_DEG.map(([, trim]) => trim));
    expect(peak).toBe(6);
    expect(toDegrees(planingAt(11).trim)).toBeCloseTo(peak, 9);
    expect(peak).toBeLessThanOrEqual(15);
  });

  it('sits at its static draft at rest', () => {
    const rest = planingAt(0);
    expect(rest.trim).toBe(0);
    expect(rest.heave).toBeCloseTo(0, 9);
    expect(rest.transomDepth).toBe(BOAT.staticDraft);
    expect(rest.wettedLength).toBe(BOAT.waterlineLength);
    expect(rest.liftShare).toBe(0);
  });

  it('rises as it planes', () => {
    expect(planingAt(11).heave).toBeCloseTo(0.146, 2);
    expect(planingAt(22).heave).toBeCloseTo(0.2, 2);
    expect(planingAt(42).heave).toBeCloseTo(0.28, 2);
    expect(heaveFor(0, BOAT.staticDraft)).toBe(0);
  });

  it('puts the keel in the water ahead of the transom by depth over trim', () => {
    const top = planingAt(42);
    expect(top.keelWettedLength).toBeCloseTo(top.transomDepth / Math.sin(top.trim), 9);
    expect(top.keelWettedLength).toBeCloseTo(3.67, 2);
    expect(top.chineWettedLength).toBe(0);
    const cruise = planingAt(22);
    expect((cruise.keelWettedLength + cruise.chineWettedLength) / 2).toBeCloseTo(3.2, 9);
    expect(planingAt(5.7).keelWettedLength).toBe(BOAT.waterlineLength);
  });

  it('splits the weight between speed and floating with Savitsky', () => {
    expect(liftShareAt(5.7, 5.1)).toBeCloseTo(0.099, 2);
    expect(planingAt(11).liftShare).toBeCloseTo(0.356, 2);
    expect(planingAt(22).liftShare).toBeCloseTo(0.807, 2);
    expect(planingAt(42).liftShare).toBeCloseTo(0.982, 2);
    for (let knots = 1; knots <= 42; knots += 1) {
      expect(planingAt(knots).liftShare).toBeGreaterThan(planingAt(knots - 1).liftShare);
    }
  });

  it('clamps speeds to the boat range and keeps every key table ordered', () => {
    expect(planingAt(60).knots).toBe(BOAT.topKnots);
    expect(planingAt(-3).knots).toBe(0);
    [TRIM_KEYS_DEG, WETTED_KEYS, TRANSOM_DEPTH_KEYS].forEach((keys) => {
      keys.slice(1).forEach(([knots], index) => expect(knots).toBeGreaterThan(keys[index][0]));
    });
  });
});
