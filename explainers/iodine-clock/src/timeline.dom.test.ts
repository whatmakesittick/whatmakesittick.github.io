import { beforeAll, describe, expect, it } from 'vitest';
import { PHASE_IDS } from './ids';
import type { PhaseId } from './ids';
import { CYCLE_UNITS, PHASE_RANGES } from './model';
import { SPEED_RANGE } from './model/playback';
import { PHASE_TONES } from './theme';
import { CLOCK_TIMELINE_BASE, createClockTimeline, describeSpeed, formatSpeed } from './timeline';
import { TEST_LOCALE, fill, initTestLocale } from './ui/testing';

const { value, during, speedValue, realTime, slower, faster, phase } = TEST_LOCALE.timeline;

describe('iodine clock timeline', () => {
  beforeAll(() => initTestLocale());

  it('runs once through the six phases', () => {
    const { phases, cycle, loop, step, nudge } = CLOCK_TIMELINE_BASE;
    expect(cycle).toBe(CYCLE_UNITS);
    expect(loop).toBe(false);
    expect(step).toBe(1);
    expect(nudge).toEqual({ fine: 5, coarse: 50 });
    expect(phases.map((entry) => entry.id)).toEqual([...PHASE_IDS]);
    phases.forEach((entry) => {
      const id = entry.id as PhaseId;
      expect(entry).toMatchObject({ ...PHASE_RANGES[id], tone: PHASE_TONES[id] });
      expect(entry.labelKey).toBe(`timeline.phase.${id}`);
      expect(entry.jumpLabelKey).toBe(`timeline.jump.${id}`);
    });
  });

  it('shows real seconds with more digits where the run is stretched', () => {
    const timeline = CLOCK_TIMELINE_BASE;
    expect(timeline.formatPhase(0)).toBe(fill(value, { seconds: '0.0' }));
    expect(timeline.formatPhase(PHASE_RANGES.exhaustion.start)).toBe(
      fill(value, { seconds: '9.00' }),
    );
    expect(timeline.formatPhase(PHASE_RANGES.iodine.start)).toBe(
      fill(value, { seconds: '10.000' }),
    );
    expect(timeline.formatPhase(CYCLE_UNITS)).toBe(fill(value, { seconds: '15.0' }));
    expect(timeline.describePhase(PHASE_RANGES.complex.start)).toBe(
      fill(during, { seconds: '10.020', phase: phase.complex }),
    );
  });

  it('follows the recipe the store holds', () => {
    const recipe = { iodateMm: 12.5, temperatureC: 20 };
    const timeline = createClockTimeline(() => recipe);
    expect(timeline.formatPhase(PHASE_RANGES.iodine.start)).toBe(
      fill(value, { seconds: '20.000' }),
    );
    recipe.iodateMm = 50;
    expect(timeline.formatPhase(PHASE_RANGES.iodine.start)).toBe(fill(value, { seconds: '5.000' }));
  });

  it('plays from a quarter speed to double speed, real time by default', () => {
    const { speed } = CLOCK_TIMELINE_BASE;
    expect(speed).toMatchObject({ min: 0, max: 3, step: 1, labelKey: 'timeline.speed' });
    expect([0, 1, 2, 3].map(formatSpeed)).toEqual(
      ['0.25', '0.5', '1', '2'].map((factor) => fill(speedValue, { factor })),
    );
    expect(describeSpeed(SPEED_RANGE.default)).toBe(realTime);
    expect(describeSpeed(0)).toBe(fill(slower, { factor: '4' }));
    expect(describeSpeed(1)).toBe(fill(slower, { factor: '2' }));
    expect(describeSpeed(3)).toBe(fill(faster, { factor: '2' }));
    expect(CLOCK_TIMELINE_BASE.rate(SPEED_RANGE.default)).toBeCloseTo(57.5, 9);
  });
});
