import { describe, expect, it } from 'vitest';
import { PHASE_IDS } from './ids';
import { CENTRE_TIME, HORIZON_TIME } from './model';
import { REAL_TIME_SPEED } from './playback';
import { BLACK_HOLE_TIMELINE, SPEED_RANGE } from './timeline';
import { PHASE_TONES } from './ui/palette';

describe('black hole timeline', () => {
  it('runs one fall once, from letting go to the centre', () => {
    const { phases, cycle, loop } = BLACK_HOLE_TIMELINE;
    expect(cycle).toBe(CENTRE_TIME);
    expect(loop).toBe(false);
    expect(phases.map((phase) => phase.id)).toEqual([...PHASE_IDS]);
    expect(phases[0].start).toBe(0);
    expect(phases.at(-1)?.end).toBe(cycle);
    expect(phases.at(-1)?.start).toBe(HORIZON_TIME);
    phases.slice(1).forEach((phase, index) => expect(phase.start).toBe(phases[index].end));
  });

  it('colours each phase with its own tone', () => {
    expect(BLACK_HOLE_TIMELINE.phases.map((phase) => phase.tone)).toEqual(
      PHASE_IDS.map((id) => PHASE_TONES[id]),
    );
    expect(PHASE_TONES.letGo).toBe('var(--let-go)');
  });

  it('scrubs in half seconds and nudges one second, or thirty with shift', () => {
    expect(BLACK_HOLE_TIMELINE.step).toBe(0.5);
    expect(BLACK_HOLE_TIMELINE.nudge).toEqual({ fine: 1, coarse: 30 });
  });

  it('plays from real time up to 32 times faster', () => {
    const { rate, speed } = BLACK_HOLE_TIMELINE;
    expect(speed).toMatchObject({ min: 0, max: 5, step: 1 });
    expect(rate(REAL_TIME_SPEED)).toBe(1);
    expect(rate(speed.max)).toBe(32);
    expect(SPEED_RANGE.default).toBe(3);
  });
});
