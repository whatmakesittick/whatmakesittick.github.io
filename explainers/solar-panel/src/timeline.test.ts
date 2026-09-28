import { describe, expect, it } from 'vitest';
import { PHASE_IDS } from './ids';
import { SOLAR_PANEL_TIMELINE, SPEED_RANGE } from './timeline';

describe('solar panel timeline', () => {
  it('covers the day from 05:00 to 19:00 with the five phases in order and no gaps', () => {
    const { phases, cycle } = SOLAR_PANEL_TIMELINE;
    expect(cycle).toBe(840);
    expect(phases.map((phase) => phase.id)).toEqual([...PHASE_IDS]);
    expect(phases[0].start).toBe(0);
    expect(phases.at(-1)?.end).toBe(cycle);
    phases.slice(1).forEach((phase, index) => expect(phase.start).toBe(phases[index].end));
  });

  it('puts solar noon inside the high sun phase', () => {
    const noon = SOLAR_PANEL_TIMELINE.phases.find((phase) => phase.id === 'noon');
    expect(noon).toMatchObject({ start: 300, end: 540, tone: 'var(--noon)' });
  });

  it('plays the speed in minutes of the day per second', () => {
    const { rate, speed } = SOLAR_PANEL_TIMELINE;
    expect(rate(10)).toBe(10);
    expect(speed).toMatchObject({ min: 2, max: 60, step: 2 });
    expect(SPEED_RANGE.default).toBe(10);
  });

  it('loops through the day a minute at a time with five minute and hour nudges', () => {
    expect(SOLAR_PANEL_TIMELINE).toMatchObject({
      loop: true,
      step: 1,
      nudge: { fine: 5, coarse: 60 },
    });
  });
});
