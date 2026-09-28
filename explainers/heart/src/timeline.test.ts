import { describe, expect, it } from 'vitest';
import { PHASE_IDS } from './ids';
import { HEART_TIMELINE, SPEED_RANGE } from './timeline';

describe('heart timeline', () => {
  it('covers one resting beat with the six phases in order and no gaps', () => {
    const { phases, cycle, loop } = HEART_TIMELINE;
    expect(cycle).toBe(800);
    expect(loop).toBe(true);
    expect(phases.map((phase) => phase.id)).toEqual([...PHASE_IDS]);
    expect(phases[0].start).toBe(0);
    expect(phases.at(-1)?.end).toBe(cycle);
    phases.slice(1).forEach((phase, index) => expect(phase.start).toBe(phases[index].end));
  });

  it('colours each phase with its own tone', () => {
    expect(HEART_TIMELINE.phases.map((phase) => phase.tone)).toEqual(
      PHASE_IDS.map((id) => `var(--${id})`),
    );
  });

  it('nudges 5 ms, or 50 ms with shift', () => {
    expect(HEART_TIMELINE.nudge).toEqual({ fine: 5, coarse: 50 });
    expect(HEART_TIMELINE.step).toBe(1);
  });

  it('beats in real time at the top stop and 32 times slower at the bottom', () => {
    const { rate, speed } = HEART_TIMELINE;
    expect(rate(speed.max)).toBe(1000);
    expect(rate(speed.min)).toBeCloseTo(1000 / 32);
    expect(rate(speed.min + speed.step)).toBeCloseTo(rate(speed.min) * 2);
  });

  it('starts eight times slower than life', () => {
    expect(SPEED_RANGE.default).toBe(2);
    expect(HEART_TIMELINE.rate(SPEED_RANGE.default)).toBe(125);
  });
});
