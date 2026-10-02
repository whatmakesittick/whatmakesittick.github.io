import { describe, expect, it } from 'vitest';
import { PHASE_IDS } from './ids';
import { MISSION_UNITS } from './model';
import { THEME } from './theme';
import { REAPER_TIMELINE, SPEED_RANGE } from './timeline';

describe('reaper timeline', () => {
  it('runs the mission once through the six phases and stops at the end', () => {
    const { phases, cycle, loop } = REAPER_TIMELINE;
    expect(cycle).toBe(MISSION_UNITS);
    expect(loop).toBe(false);
    expect(phases.map((phase) => phase.id)).toEqual([...PHASE_IDS]);
    expect(phases[0].start).toBe(0);
    expect(phases.at(-1)?.end).toBe(cycle);
    phases.slice(1).forEach((phase, index) => expect(phase.start).toBe(phases[index].end));
  });

  it('colours each phase with its theme tone', () => {
    expect(REAPER_TIMELINE.phases.map((phase) => phase.tone)).toEqual(
      PHASE_IDS.map((id) => THEME[id]),
    );
  });

  it('scrubs in tenths of a unit and nudges half a unit, or two with shift', () => {
    expect(REAPER_TIMELINE.step).toBe(0.1);
    expect(REAPER_TIMELINE.nudge).toEqual({ fine: 0.5, coarse: 2 });
  });

  it('plays the mission in 90 s at normal speed, from a quarter to four times as fast', () => {
    const { rate, speed } = REAPER_TIMELINE;
    expect(speed).toMatchObject({ min: 0.25, max: 4, step: 0.25 });
    expect(MISSION_UNITS / rate(1)).toBeCloseTo(90, 9);
    expect(rate(2)).toBeCloseTo(2 * rate(1), 9);
    expect(SPEED_RANGE.default).toBe(1);
  });
});
