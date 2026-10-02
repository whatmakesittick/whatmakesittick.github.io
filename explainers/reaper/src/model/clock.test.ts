import { describe, expect, it } from 'vitest';
import { MISSION_END_MIN, MISSION_UNITS, PHASE_RANGES, minutesAt } from './mission';
import { clockAt, hoursAndMinutes, missionShareAt } from './clock';

describe('mission clock readings', () => {
  it('splits mission minutes into hours, minutes and seconds', () => {
    expect(clockAt(0)).toEqual({ hours: 0, minutes: 0, seconds: 0 });
    expect(clockAt(625)).toEqual({ hours: 10, minutes: 25, seconds: 0 });
    expect(clockAt(480 + 25 / 60)).toEqual({ hours: 8, minutes: 0, seconds: 25 });
    expect(clockAt(59.999)).toEqual({ hours: 1, minutes: 0, seconds: 0 });
  });

  it('rounds hours to whole minutes', () => {
    expect(hoursAndMinutes(10.838)).toEqual({ hours: 10, minutes: 50 });
    expect(hoursAndMinutes(1.081)).toEqual({ hours: 1, minutes: 5 });
    expect(hoursAndMinutes(0.999)).toEqual({ hours: 1, minutes: 0 });
  });

  it('reads the share of the mission flown', () => {
    expect(missionShareAt(0)).toBe(0);
    const onStation = PHASE_RANGES.loiter.start;
    expect(missionShareAt(onStation)).toBeCloseTo(minutesAt(onStation) / MISSION_END_MIN, 9);
    expect(missionShareAt(MISSION_UNITS)).toBe(1);
  });
});
