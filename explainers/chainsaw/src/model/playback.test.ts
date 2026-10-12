import { describe, expect, it } from 'vitest';
import { IDLE_RPM, MAX_POWER_RPM } from './constants';
import { SPEED_RANGE, rate, rpmScale, screenTurnSeconds, slowMotion } from './playback';

describe('playback', () => {
  it('slows the turn 512 times by default, between 64 and 2,048 times', () => {
    expect(slowMotion(SPEED_RANGE.default)).toBe(512);
    expect(slowMotion(SPEED_RANGE.max)).toBe(64);
    expect(slowMotion(SPEED_RANGE.min)).toBe(2048);
  });

  it('turns once in about 3.1 s at full throttle and 11.4 s at idle', () => {
    expect(screenTurnSeconds(SPEED_RANGE.default, MAX_POWER_RPM)).toBeCloseTo(3.1, 1);
    expect(screenTurnSeconds(SPEED_RANGE.default, IDLE_RPM)).toBeCloseTo(11.4, 1);
  });

  it('defines the rate at max power speed', () => {
    expect(rpmScale(MAX_POWER_RPM)).toBe(1);
    expect(rate(SPEED_RANGE.default) * slowMotion(SPEED_RANGE.default)).toBeCloseTo(59_400, 6);
  });
});
