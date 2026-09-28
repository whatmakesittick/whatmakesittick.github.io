import { describe, expect, it } from 'vitest';
import { PHASE_IDS } from './ids';
import { ATP_TIMELINE, SPEED_RANGE } from './timeline';

describe('ATP synthase timeline', () => {
  it('covers one lap with the three ATP in order and no gaps', () => {
    const { phases, cycle, loop } = ATP_TIMELINE;
    expect(cycle).toBe(360);
    expect(loop).toBe(true);
    expect(phases.map((phase) => phase.id)).toEqual([...PHASE_IDS]);
    expect(phases[0].start).toBe(0);
    expect(phases.at(-1)?.end).toBe(cycle);
    phases.slice(1).forEach((phase, index) => expect(phase.start).toBe(phases[index].end));
    phases.forEach((phase) => expect(phase.end - phase.start).toBe(120));
  });

  it('colours each ATP with its own tone', () => {
    expect(ATP_TIMELINE.phases.map((phase) => phase.tone)).toEqual([
      'var(--first-atp)',
      'var(--second-atp)',
      'var(--third-atp)',
    ]);
  });

  it('nudges one degree, or one proton of the human ring with shift', () => {
    expect(ATP_TIMELINE.nudge).toEqual({ fine: 1, coarse: 45 });
    expect(ATP_TIMELINE.step).toBe(1);
  });

  it('turns 100 times a second in real time and 1024 times slower at the bottom', () => {
    const { rate, speed } = ATP_TIMELINE;
    expect(rate(speed.max)).toBeCloseTo(36_000);
    expect(rate(speed.min)).toBeCloseTo(36_000 / 1024);
    expect(360 / rate(speed.min)).toBeCloseTo(10.24);
  });

  it('plays faster at every higher stop and starts 256 times slower than life', () => {
    const { rate, speed } = ATP_TIMELINE;
    expect(rate(speed.min + speed.step)).toBeCloseTo(rate(speed.min) * 2);
    expect(rate(SPEED_RANGE.default)).toBeCloseTo(140.625);
  });
});
