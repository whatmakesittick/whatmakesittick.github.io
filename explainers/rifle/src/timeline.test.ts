import { describe, expect, it } from 'vitest';
import { PHASE_IDS } from './ids';
import { REAL_PACE_SPEED } from './model';
import { RIFLE_TIMELINE, SPEED_RANGE } from './timeline';
import { PHASE_TONES } from './ui/palette';

describe('rifle timeline', () => {
  it('loops one cycle of 100 units through the six steps', () => {
    const { phases, cycle, loop } = RIFLE_TIMELINE;
    expect(cycle).toBe(100);
    expect(loop).toBeUndefined();
    expect(phases.map((phase) => phase.id)).toEqual([...PHASE_IDS]);
    expect(phases[0].start).toBe(0);
    expect(phases.at(-1)?.end).toBe(cycle);
    phases.slice(1).forEach((phase, index) => expect(phase.start).toBe(phases[index].end));
  });

  it('colours each step with its own tone', () => {
    expect(RIFLE_TIMELINE.phases.map((phase) => phase.tone)).toEqual(
      PHASE_IDS.map((id) => PHASE_TONES[id]),
    );
    expect(PHASE_TONES.strike).toBe('var(--strike)');
  });

  it('scrubs in tenths of a unit and nudges one unit, or ten with shift', () => {
    expect(RIFLE_TIMELINE.step).toBe(0.1);
    expect(RIFLE_TIMELINE.nudge).toEqual({ fine: 1, coarse: 10 });
  });

  it('plays one shot in 25.6 s at the slowest stop and in 0.1 s at real pace', () => {
    const { rate, speed } = RIFLE_TIMELINE;
    expect(speed).toMatchObject({ min: 0, max: 4, step: 1 });
    expect(rate(speed.min)).toBeCloseTo(100 / 25.6);
    expect(rate(REAL_PACE_SPEED)).toBeCloseTo(1000);
    expect(SPEED_RANGE.default).toBe(1);
  });
});
