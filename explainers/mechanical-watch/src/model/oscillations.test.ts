import { describe, expect, it } from 'vitest';
import { START_TIME_ON_DIAL_S } from './kinematics';
import {
  REAL_TIME_SPEED,
  cycleCountAfter,
  formatTimeOnDial,
  phaseDegreesPerSecond,
  slowMotionFactor,
} from './oscillations';

describe('slow motion', () => {
  it('plays four swings a second in real time at the top stop', () => {
    expect(slowMotionFactor(REAL_TIME_SPEED)).toBe(1);
    expect(phaseDegreesPerSecond(REAL_TIME_SPEED)).toBeCloseTo(1440);
  });

  it('halves the pace at every stop down to 1/256', () => {
    expect(phaseDegreesPerSecond(7)).toBeCloseTo(720);
    expect(slowMotionFactor(0)).toBe(256);
    expect(phaseDegreesPerSecond(0)).toBeCloseTo(1440 / 256);
  });
});

describe('time on the dial', () => {
  it('reads the start time as the hands show it', () => {
    expect(formatTimeOnDial(START_TIME_ON_DIAL_S)).toBe('10:09:30');
  });

  it('drops fractions of a second and pads every field', () => {
    expect(formatTimeOnDial(3600 + 60 + 5.9)).toBe('01:01:05');
  });

  it('shows twelve instead of zero on a twelve-hour dial', () => {
    expect(formatTimeOnDial(0)).toBe('12:00:00');
    expect(formatTimeOnDial(13 * 3600)).toBe('01:00:00');
  });

  it('counts a wrap of the loop as one more swing', () => {
    expect(cycleCountAfter(350, 5, 2)).toBe(3);
  });
});
