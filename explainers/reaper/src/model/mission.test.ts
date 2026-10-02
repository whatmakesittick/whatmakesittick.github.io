import { describe, expect, it } from 'vitest';
import { PHASE_IDS } from '../ids';
import {
  BASE_UNITS_PER_SECOND,
  HANDBACK_MIN,
  HANDOVER_MIN,
  MISSION_END_MIN,
  MISSION_UNITS,
  MOMENTS,
  PHASE_RANGES,
  SEGMENTS,
  linkAt,
  minutesAt,
  phaseAt,
  phaseShareAt,
  unitsAt,
} from './mission';

describe('mission clock', () => {
  it('covers the scrubber and the sortie without gaps', () => {
    expect(SEGMENTS[0].units[0]).toBe(0);
    expect(SEGMENTS[SEGMENTS.length - 1].units[1]).toBe(MISSION_UNITS);
    expect(SEGMENTS[SEGMENTS.length - 1].minutes[1]).toBe(MISSION_END_MIN);
    SEGMENTS.slice(1).forEach((segment, index) => {
      expect(segment.units[0]).toBe(SEGMENTS[index].units[1]);
      expect(segment.minutes[0]).toBe(SEGMENTS[index].minutes[1]);
    });
  });

  it('maps units to minutes and back', () => {
    expect(minutesAt(0)).toBe(0);
    expect(minutesAt(40)).toBe(90);
    expect(minutesAt(62)).toBe(480);
    expect(minutesAt(MISSION_UNITS)).toBe(MISSION_END_MIN);
    [3, 17, 33, 55, 70, 90, 98].forEach((units) => {
      expect(unitsAt(minutesAt(units))).toBeCloseTo(units, 9);
    });
  });

  it('gives the strike half a minute of mission time', () => {
    expect(minutesAt(78) - minutesAt(62)).toBeCloseTo(0.5, 9);
  });

  it('runs the whole mission in ninety seconds at normal speed', () => {
    expect(MISSION_UNITS / BASE_UNITS_PER_SECOND).toBe(90);
  });

  it('names the phases in order and in scrubber order', () => {
    PHASE_IDS.forEach((id, index) => {
      const range = PHASE_RANGES[id];
      expect(phaseAt(range.start)).toBe(id);
      if (index > 0) expect(range.start).toBe(PHASE_RANGES[PHASE_IDS[index - 1]].end);
    });
    expect(phaseAt(MISSION_UNITS)).toBe('return');
    expect(phaseShareAt(51)).toBeCloseTo(0.5, 9);
  });

  it('hands the aircraft to the satellite crew and back', () => {
    expect(linkAt(0)).toBe('los');
    expect(linkAt(HANDOVER_MIN)).toBe('sat');
    expect(linkAt(HANDBACK_MIN - 1)).toBe('sat');
    expect(linkAt(HANDBACK_MIN)).toBe('los');
  });

  it('places the moments at their mission minutes', () => {
    expect(minutesAt(MOMENTS.handover)).toBeCloseTo(HANDOVER_MIN, 9);
    expect(minutesAt(MOMENTS.onStation)).toBe(90);
    expect(minutesAt(MOMENTS.launch)).toBe(480);
    expect((minutesAt(MOMENTS.impact) - 480) * 60).toBeCloseTo(25, 9);
    expect(minutesAt(MOMENTS.handback)).toBeCloseTo(HANDBACK_MIN, 9);
    expect(minutesAt(MOMENTS.touchdown)).toBeCloseTo(620, 9);
    expect(MOMENTS.liftoff).toBeCloseTo(7.3, 1);
  });
});
