import { describe, expect, it } from 'vitest';
import {
  SPRINT_KMH,
  TILT_RANGE,
  accelerationAt,
  accelerationInG,
  secondsToKmh,
  thrustShareAt,
} from './tilt';

describe('tilt', () => {
  it('pushes sideways by g times the tangent of the tilt', () => {
    expect(accelerationAt(10)).toBeCloseTo(1.73, 2);
    expect(accelerationAt(20)).toBeCloseTo(3.57, 2);
    expect(accelerationAt(30)).toBeCloseTo(5.66, 2);
    expect(accelerationAt(45)).toBeCloseTo(9.81, 2);
    expect(accelerationInG(45)).toBeCloseTo(1, 9);
    expect(accelerationAt(0)).toBe(0);
  });

  it('needs more thrust the more it tilts', () => {
    expect(thrustShareAt(0)).toBe(1);
    expect(thrustShareAt(30)).toBeCloseTo(1.155, 3);
    expect(thrustShareAt(45)).toBeCloseTo(1.414, 3);
    expect(thrustShareAt(60)).toBeCloseTo(2, 9);
  });

  it('sprints to a hundred in about five seconds at thirty degrees', () => {
    expect(SPRINT_KMH).toBe(100);
    expect(secondsToKmh(30, SPRINT_KMH)).toBeCloseTo(4.9, 1);
    expect(secondsToKmh(45, SPRINT_KMH)).toBeCloseTo(2.83, 2);
    expect(secondsToKmh(0, SPRINT_KMH)).toBe(Number.POSITIVE_INFINITY);
  });

  it('slides from level to sixty degrees starting at thirty', () => {
    expect(TILT_RANGE).toEqual({ min: 0, max: 60, step: 1, default: 30 });
  });
});
