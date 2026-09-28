import { describe, expect, it } from 'vitest';
import { PHASE_IDS } from './ids';
import { WATCH_TIMELINE } from './timeline';

describe('watch timeline', () => {
  it('covers one full swing with the six moments in order and no gaps', () => {
    const { phases, cycle } = WATCH_TIMELINE;
    expect(phases.map((phase) => phase.id)).toEqual([...PHASE_IDS]);
    expect(phases[0].start).toBe(0);
    expect(phases.at(-1)?.end).toBe(cycle);
    phases.slice(1).forEach((phase, index) => expect(phase.start).toBe(phases[index].end));
  });

  it('centres the tick and the tock on the centre line crossings', () => {
    const [, tick, , , tock] = WATCH_TIMELINE.phases;
    expect((tick.start + tick.end) / 2).toBeCloseTo(90);
    expect((tock.start + tock.end) / 2).toBeCloseTo(270);
    expect(tick.end - tick.start).toBeCloseTo(10.26, 1);
  });

  it('plays in real time at the fastest stop and 256 times slower at the slowest', () => {
    const { rate, speed } = WATCH_TIMELINE;
    expect(rate(speed.min)).toBeCloseTo(1440);
    expect(rate(speed.max)).toBeCloseTo(1440 / 256);
  });
});
