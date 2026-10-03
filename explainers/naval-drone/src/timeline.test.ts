import { describe, expect, it } from 'vitest';
import { PHASE_IDS } from './ids';
import { PHASE_RANGES, RUN_SECONDS } from './model';
import { THEME } from './theme';
import { NAVAL_DRONE_TIMELINE, SPEED_RANGE } from './timeline';

describe('naval drone timeline', () => {
  it('runs the route once through the five phases and stops at the ship', () => {
    const { phases, cycle, loop } = NAVAL_DRONE_TIMELINE;
    expect(cycle).toBe(RUN_SECONDS);
    expect(loop).toBe(false);
    expect(phases.map((phase) => phase.id)).toEqual([...PHASE_IDS]);
    phases.forEach((phase) => expect(phase).toMatchObject(PHASE_RANGES[phase.id as never]));
    expect(phases[0].start).toBe(0);
    expect(phases.at(-1)?.end).toBe(cycle);
    phases.slice(1).forEach((phase, index) => expect(phase.start).toBe(phases[index].end));
  });

  it('colours each phase with its theme tone and names it from the locale', () => {
    expect(NAVAL_DRONE_TIMELINE.phases.map((phase) => phase.tone)).toEqual(
      PHASE_IDS.map((id) => THEME[id]),
    );
    NAVAL_DRONE_TIMELINE.phases.forEach((phase) => {
      expect(phase.labelKey).toBe(`timeline.phase.${phase.id}`);
      expect(phase.jumpLabelKey).toBe(`timeline.jump.${phase.id}`);
    });
  });

  it('scrubs in tenths of a second and nudges half a second, or five with shift', () => {
    expect(NAVAL_DRONE_TIMELINE.step).toBe(0.1);
    expect(NAVAL_DRONE_TIMELINE.nudge).toEqual({ fine: 0.5, coarse: 5 });
    expect(NAVAL_DRONE_TIMELINE.labelKey).toBe('timeline.label');
    expect(NAVAL_DRONE_TIMELINE.phasesLabelKey).toBe('timeline.phases');
  });

  it('plays the run in two minutes at normal speed, from a quarter to four times as fast', () => {
    const { rate, speed } = NAVAL_DRONE_TIMELINE;
    expect(speed).toMatchObject({ min: 0.25, max: 4, step: 0.25, labelKey: 'timeline.speed' });
    expect(RUN_SECONDS / rate(1)).toBe(120);
    expect(rate(2)).toBe(2);
    expect(SPEED_RANGE.default).toBe(1);
  });
});
