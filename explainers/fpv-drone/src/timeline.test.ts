import { describe, expect, it } from 'vitest';
import { PHASE_IDS } from './ids';
import { SORTIE_SECONDS } from './model';
import { THEME } from './theme';
import { FPV_TIMELINE, SPEED_RANGE } from './timeline';

describe('fpv timeline', () => {
  it('runs the sortie once through the six phases and stops at the end', () => {
    const { phases, cycle, loop } = FPV_TIMELINE;
    expect(cycle).toBe(SORTIE_SECONDS);
    expect(loop).toBe(false);
    expect(phases.map((phase) => phase.id)).toEqual([...PHASE_IDS]);
    expect(phases[0].start).toBe(0);
    expect(phases.at(-1)?.end).toBe(cycle);
    phases.slice(1).forEach((phase, index) => expect(phase.start).toBe(phases[index].end));
  });

  it('colours each phase with its theme tone and names its keys', () => {
    expect(FPV_TIMELINE.phases.map((phase) => phase.tone)).toEqual(
      PHASE_IDS.map((id) => THEME[id]),
    );
    FPV_TIMELINE.phases.forEach((phase) => {
      expect(phase.labelKey).toBe(`timeline.phase.${phase.id}`);
      expect(phase.jumpLabelKey).toBe(`timeline.jump.${phase.id}`);
    });
  });

  it('scrubs in tenths of a second and nudges half a second, or five with shift', () => {
    expect(FPV_TIMELINE.step).toBe(0.1);
    expect(FPV_TIMELINE.nudge).toEqual({ fine: 0.5, coarse: 5 });
  });

  it('plays in real time at normal speed, from a quarter to four times as fast', () => {
    const { rate, speed } = FPV_TIMELINE;
    expect(speed).toMatchObject({ min: 0.25, max: 4, step: 0.25 });
    expect(rate(1)).toBe(1);
    expect(rate(2)).toBe(2);
    expect(SPEED_RANGE.default).toBe(1);
  });
});
