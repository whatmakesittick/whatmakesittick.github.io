import { describe, expect, it } from 'vitest';
import { CENTRE_TIME, HORIZON_TIME, tauAtRadius } from '../model';
import { clocksOf, fallOf } from './derived';

describe('the fall at a moment', () => {
  it('starts at rest five horizon radii out', () => {
    expect(fallOf({ phase: 0 })).toMatchObject({ tau: 0, radius: 5, phase: 'letGo' });
    expect(fallOf({ phase: 0 }).eta).toBeCloseTo(0, 5);
    expect(fallOf({ phase: 0 }).speed).toBeCloseTo(0, 5);
    expect(fallOf({ phase: 0 }).timeLeft).toBeCloseTo(CENTRE_TIME, 5);
  });

  it('passes the spec radii at the spec speeds', () => {
    expect(fallOf({ phase: tauAtRadius(4) }).speed).toBeCloseTo(0.25, 2);
    expect(fallOf({ phase: tauAtRadius(2) }).speed).toBeCloseTo(0.61, 2);
    expect(fallOf({ phase: tauAtRadius(1.5) })).toMatchObject({ phase: 'lightRing' });
    expect(fallOf({ phase: tauAtRadius(1.5) }).radius).toBeCloseTo(1.5, 5);
  });

  it('crosses the horizon at light speed and ends at the centre', () => {
    expect(fallOf({ phase: HORIZON_TIME }).phase).toBe('inside');
    expect(fallOf({ phase: HORIZON_TIME }).speed).toBeCloseTo(1, 5);
    expect(fallOf({ phase: HORIZON_TIME }).timeLeft).toBeCloseTo(30.1, 0);
    expect(fallOf({ phase: CENTRE_TIME }).radius).toBeCloseTo(0, 5);
    expect(fallOf({ phase: CENTRE_TIME }).timeLeft).toBe(0);
  });

  it('works the values out once for each phase', () => {
    const first = fallOf({ phase: 100 });
    expect(fallOf({ phase: 100 })).toBe(first);
    expect(fallOf({ phase: 101 })).not.toBe(first);
  });
});

describe('the clocks at a moment', () => {
  it('already disagree at the release', () => {
    const clocks = clocksOf({ phase: 0 });
    expect(clocks.probeClock).toBe(0);
    expect(clocks.shipClock).toBeCloseTo(0, 5);
    expect(clocks.ratio).toBeCloseTo(1.08, 2);
    expect(clocks.flashTone).toBe('white');
    expect(clocks.dimming).toBeCloseTo(0.64, 2);
    expect(clocks.tide).toBeLessThan(1e-4);
  });

  it('match the model checks at 2 horizon radii', () => {
    const clocks = clocksOf({ phase: tauAtRadius(2) });
    expect(clocks.shipClock).toBeCloseTo(941, 0);
    expect(clocks.ratio).toBeCloseTo(2.77, 2);
    expect(clocks.flashGap).toBeCloseTo(27.7, 1);
    expect(clocks.dimming).toBeCloseTo(0.0145, 3);
    expect(clocks.flashTone).toBe('red');
  });

  it('never returns a NaN inside the horizon', () => {
    [HORIZON_TIME, HORIZON_TIME + 10, CENTRE_TIME].forEach((phase) => {
      const clocks = clocksOf({ phase });
      expect(clocks.shipClock).toBe(Infinity);
      expect(clocks.ratio).toBe(Infinity);
      expect(clocks.flashGap).toBe(Infinity);
      expect(clocks.dimming).toBe(0);
      expect(clocks.flashTone).toBe('gone');
      expect(Number.isNaN(clocks.tide)).toBe(false);
    });
  });

  it('stretches a body by a ten-thousandth of g at the horizon', () => {
    expect(clocksOf({ phase: HORIZON_TIME }).tide).toBeCloseTo(1.14e-4, 6);
    expect(clocksOf({ phase: CENTRE_TIME }).tide).toBeGreaterThan(1);
  });
});
