import { describe, expect, it } from 'vitest';
import { PHASE_IDS } from './ids';
import { REAL_TIME_SPEED } from './model/playback';
import { PHASE_TONES } from './ui/palette';
import { RAPTOR_TIMELINE, SPEED_RANGE } from './timeline';

describe('raptor timeline', () => {
  it('runs one launch burn once, from the start command to two seconds after cutoff', () => {
    const { phases, cycle, loop } = RAPTOR_TIMELINE;
    expect(cycle).toBe(145);
    expect(loop).toBe(false);
    expect(phases.map((phase) => phase.id)).toEqual([...PHASE_IDS]);
    expect(phases[0].start).toBe(0);
    expect(phases.at(-1)?.end).toBe(cycle);
    phases.slice(1).forEach((phase, index) => expect(phase.start).toBe(phases[index].end));
  });

  it('colours each phase with its own tone', () => {
    expect(RAPTOR_TIMELINE.phases.map((phase) => phase.tone)).toEqual(
      PHASE_IDS.map((id) => PHASE_TONES[id]),
    );
  });

  it('scrubs in tenths of a second and nudges half a second, or five with shift', () => {
    expect(RAPTOR_TIMELINE.step).toBe(0.1);
    expect(RAPTOR_TIMELINE.nudge).toEqual({ fine: 0.5, coarse: 5 });
  });

  it('plays from eight times slower to four times faster than real time', () => {
    const { rate, speed } = RAPTOR_TIMELINE;
    expect(speed).toMatchObject({ min: 0, max: 5, step: 1 });
    expect(rate(REAL_TIME_SPEED)).toBe(1);
    expect(rate(speed.min)).toBe(1 / 8);
    expect(rate(speed.max)).toBe(4);
  });

  it('starts in real time', () => {
    expect(SPEED_RANGE.default).toBe(REAL_TIME_SPEED);
  });
});
