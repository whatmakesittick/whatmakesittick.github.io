import { describe, expect, it } from 'vitest';
import { THROTTLE_KEYS, altitudeKm, engineState, phaseAtAltitude, throttle } from '../model';
import { HEIGHT_RANGE } from './ranges';

describe('height range', () => {
  it('climbs from the pad in half-kilometre steps', () => {
    expect(HEIGHT_RANGE.min).toBe(0);
    expect(HEIGHT_RANGE.step).toBe(0.5);
    expect(HEIGHT_RANGE.max % HEIGHT_RANGE.step).toBe(0);
  });

  it('stops at the last full-throttle height, before the cutoff throttle-down', () => {
    const [lastFullTime] = THROTTLE_KEYS.filter(([, share]) => share === 1).at(-1) ?? [0];
    expect(lastFullTime).toBe(128);
    expect(HEIGHT_RANGE.max).toBeLessThanOrEqual(altitudeKm(lastFullTime));
    expect(HEIGHT_RANGE.max).toBeGreaterThan(altitudeKm(lastFullTime) - HEIGHT_RANGE.step);
    const top = engineState(phaseAtAltitude(HEIGHT_RANGE.max));
    expect(throttle(top.time)).toBe(1);
  });
});
