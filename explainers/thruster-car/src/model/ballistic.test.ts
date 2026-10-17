import { describe, expect, it } from 'vitest';
import { toRadians } from '@core/math';
import { G } from './constants';
import { airTime, launchSpeed, peakHeight, range } from './ballistic';

const EXIT_ANGLE = toRadians(42);

describe('ballistic', () => {
  it('leaves the 4 m ramp at 13.3 m/s from 16 m/s', () => {
    expect(launchSpeed(16, 4)).toBeCloseTo(13.3, 1);
    expect(launchSpeed(5, 4)).toBe(0);
  });

  it('peaks at 8.05 m from the ramp exit', () => {
    expect(peakHeight(launchSpeed(16, 4), EXIT_ANGLE, 4)).toBeCloseTo(8.05, 2);
  });

  it('times the free arc to the ground and the distance it covers', () => {
    const speed = launchSpeed(16, 4);
    expect(airTime(speed, EXIT_ANGLE, 4)).toBeCloseTo(2.19, 2);
    expect(range(speed, EXIT_ANGLE, 4)).toBeCloseTo(
      speed * Math.cos(EXIT_ANGLE) * airTime(speed, EXIT_ANGLE, 4),
      9,
    );
    expect(airTime(10, EXIT_ANGLE, 0)).toBeCloseTo((2 * 10 * Math.sin(EXIT_ANGLE)) / G, 9);
  });
});
