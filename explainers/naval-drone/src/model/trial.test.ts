import { describe, expect, it } from 'vitest';
import { SPEED_MARK_IDS } from '../ids';
import {
  MARK_TOLERANCE_KN,
  SPEED_MARKS,
  THROTTLE_PERCENT,
  TRIAL_KNOTS,
  speedMarkAt,
  stepTo,
  throttlePercentOf,
  throttleShareOf,
  trialKnotsOf,
} from './trial';

describe('speed trial', () => {
  it('lets the reader set any speed from rest to the 42 kn top speed in tenths', () => {
    expect(TRIAL_KNOTS).toEqual({ min: 0, max: 42, step: 0.1 });
    expect(THROTTLE_PERCENT).toEqual({ min: 0, max: 100, step: 1 });
  });

  it('marks hull speed, the hump, planing, cruise and top speed', () => {
    expect(SPEED_MARK_IDS.map((mark) => SPEED_MARKS[mark])).toEqual([5.7, 11, 16, 22, 42]);
    expect(MARK_TOLERANCE_KN).toBe(0.25);
  });

  it('keeps a trial speed inside the slider and on its tenths', () => {
    expect(trialKnotsOf(-3)).toBe(0);
    expect(trialKnotsOf(50)).toBe(42);
    expect(trialKnotsOf(11.04)).toBe(11);
    expect(trialKnotsOf(5.66)).toBe(5.7);
  });

  it('keeps any value inside its range and on its step', () => {
    const range = { min: 50, max: 1000, step: 10 };
    expect(stepTo(333, range)).toBe(330);
    expect(stepTo(10, range)).toBe(50);
    expect(stepTo(2000, range)).toBe(1000);
    expect(stepTo(0.7, { min: 0, max: 1, step: 0.1 })).toBe(0.7);
    expect(stepTo(0.35, { min: 0, max: 1, step: 0.05 })).toBe(0.35);
  });

  it('turns throttle percents into a share of full flow and back', () => {
    expect(throttleShareOf(55)).toBeCloseTo(0.55, 12);
    expect(throttleShareOf(140)).toBe(1);
    expect(throttleShareOf(-5)).toBe(0);
    expect(throttlePercentOf(0.694)).toBe(69);
    expect(throttlePercentOf(1.2)).toBe(100);
  });

  it('finds the mark within a quarter knot and none between marks', () => {
    expect(speedMarkAt(5.9)).toBe('hullSpeed');
    expect(speedMarkAt(21.8)).toBe('cruise');
    expect(speedMarkAt(42)).toBe('top');
    expect(speedMarkAt(5.4)).toBeUndefined();
    expect(speedMarkAt(30)).toBeUndefined();
  });
});
