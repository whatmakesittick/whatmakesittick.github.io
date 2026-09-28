import { describe, expect, it } from 'vitest';
import { PHASE_IDS } from '../ids';
import {
  DAY_CYCLE_MIN,
  DAY_START_MIN,
  PHASE_RANGES,
  SUNRISE_MIN,
  SUNSET_MIN,
  SUN_MOMENTS,
  ambientTemperatureC,
  clockParts,
  isDaylight,
  minuteOfDay,
  phaseAt,
  phaseOfMinute,
} from './day';

describe('PHASE_RANGES', () => {
  it('tiles the cycle without gaps', () => {
    let cursor = 0;
    for (const id of PHASE_IDS) {
      expect(PHASE_RANGES[id].start).toBe(cursor);
      cursor = PHASE_RANGES[id].end;
    }
    expect(cursor).toBe(DAY_CYCLE_MIN);
  });

  it('names the phase at a minute', () => {
    expect(phaseAt(0)).toBe('dawn');
    expect(phaseAt(119)).toBe('dawn');
    expect(phaseAt(120)).toBe('morning');
    expect(phaseAt(420)).toBe('noon');
    expect(phaseAt(839)).toBe('dusk');
    expect(phaseAt(DAY_CYCLE_MIN)).toBe('dusk');
  });
});

describe('minuteOfDay', () => {
  it('starts the cycle at five in the morning', () => {
    expect(minuteOfDay(0)).toBe(DAY_START_MIN);
    expect(clockParts(minuteOfDay(0))).toEqual({ hours: 5, minutes: 0 });
    expect(clockParts(minuteOfDay(SUN_MOMENTS.noon))).toEqual({ hours: 12, minutes: 0 });
    expect(phaseOfMinute(minuteOfDay(210))).toBe(210);
  });

  it('places the sun moments inside daylight', () => {
    for (const phase of Object.values(SUN_MOMENTS)) {
      expect(isDaylight(minuteOfDay(phase))).toBe(true);
    }
    expect(isDaylight(SUNRISE_MIN)).toBe(false);
    expect(isDaylight(SUNSET_MIN)).toBe(false);
  });
});

describe('ambientTemperatureC', () => {
  it('is warmest mid afternoon and coolest before dawn', () => {
    expect(ambientTemperatureC(900)).toBeCloseTo(22);
    expect(ambientTemperatureC(180)).toBeCloseTo(10);
    expect(ambientTemperatureC(720)).toBeGreaterThan(ambientTemperatureC(SUNRISE_MIN));
  });
});
