import { describe, expect, it } from 'vitest';
import {
  CORE_IDLE_SHARE,
  CORE_RATIO_TO_FAN,
  FAN_BLADE_MIN_OPACITY,
  FAN_BLUR_MAX,
  FAN_IDLE_SHARE,
  FAN_VISUAL_TURNS_MAX,
  REVERSE_LEVER_CAP,
  coreTurnsPerSecond,
  effectiveLever,
  fanBladeOpacity,
  fanBlurOpacity,
  fanTurnsPerSecond,
  spoolSpeeds,
} from './spools';

describe('spools', () => {
  it('runs from idle to the full takeoff share', () => {
    expect(spoolSpeeds(0, 0)).toEqual({ fan: FAN_IDLE_SHARE, core: CORE_IDLE_SHARE });
    expect(spoolSpeeds(1, 0)).toEqual({ fan: 1, core: 1 });
  });

  it('rises with the lever', () => {
    expect(spoolSpeeds(0.7, 0).fan).toBeGreaterThan(spoolSpeeds(0.4, 0).fan);
  });

  it('caps the lever while the reverser is deployed', () => {
    expect(effectiveLever(1, 1)).toBe(REVERSE_LEVER_CAP);
    expect(effectiveLever(1, 0)).toBe(1);
    expect(effectiveLever(0.2, 1)).toBe(0.2);
  });

  it('caps the visual fan rate and keeps the core ratio', () => {
    expect(fanTurnsPerSecond(1)).toBe(FAN_VISUAL_TURNS_MAX);
    expect(coreTurnsPerSecond(1) / fanTurnsPerSecond(1)).toBeCloseTo(CORE_RATIO_TO_FAN);
  });

  it('grows the blur and never fades the blades under the minimum', () => {
    expect(fanBlurOpacity(0.2)).toBe(0);
    expect(fanBlurOpacity(1)).toBeCloseTo(FAN_BLUR_MAX);
    expect(fanBladeOpacity(1)).toBeCloseTo(FAN_BLADE_MIN_OPACITY);
    expect(fanBladeOpacity(0.5)).toBeGreaterThan(FAN_BLADE_MIN_OPACITY);
  });
});
