import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import en from '../locales/en.json';
import { MOMENT_IDS, PHASE_IDS } from './ids';
import type { PhaseId } from './ids';
import { CYCLE_UNITS, PHASE_RANGES } from './model';
import { PHASE_TONES } from './theme';
import { DEFAULT_SPEED, MOMENTS, PICTURE_SPEED, SPEED_RANGE } from './model';
import {
  MRI_SCANNER_TIMELINE,
  describePhase,
  describeSpeed,
  formatPhase,
  formatSpeed,
  momentAt,
} from './timeline';

describe('mri scanner timeline', () => {
  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  it('loops one repetition through the five steps of the spin echo', () => {
    const { phases, cycle, loop } = MRI_SCANNER_TIMELINE;
    expect(cycle).toBe(CYCLE_UNITS);
    expect(loop).toBe(true);
    expect(phases.map((phase) => phase.id)).toEqual([...PHASE_IDS]);
    phases.forEach((phase) => {
      const [start, end] = PHASE_RANGES[phase.id as PhaseId];
      expect(phase).toMatchObject({ start, end });
    });
    expect(phases[0].start).toBe(0);
    expect(phases.at(-1)?.end).toBe(cycle);
    phases.slice(1).forEach((phase, index) => expect(phase.start).toBe(phases[index].end));
  });

  it('colours each step with its theme tone and names it from the locale', () => {
    expect(MRI_SCANNER_TIMELINE.phases.map((phase) => phase.tone)).toEqual(
      PHASE_IDS.map((id) => PHASE_TONES[id]),
    );
    MRI_SCANNER_TIMELINE.phases.forEach((phase) => {
      expect(phase.labelKey).toBe(`timeline.phase.${phase.id}`);
      expect(phase.jumpLabelKey).toBe(`timeline.jump.${phase.id}`);
    });
  });

  it('scrubs one unit at a time and nudges five, or fifty with shift', () => {
    expect(MRI_SCANNER_TIMELINE.step).toBe(1);
    expect(MRI_SCANNER_TIMELINE.nudge).toEqual({ fine: 5, coarse: 50 });
    expect(MRI_SCANNER_TIMELINE.labelKey).toBe('timeline.label');
    expect(MRI_SCANNER_TIMELINE.phasesLabelKey).toBe('timeline.phases');
  });

  it('counts speed in repetitions per minute, six by default and thirty for the picture', () => {
    const { rate, speed } = MRI_SCANNER_TIMELINE;
    expect(speed).toMatchObject({ min: 2, max: 60, step: 1, labelKey: 'timeline.speed' });
    expect(DEFAULT_SPEED).toBe(6);
    expect(SPEED_RANGE.default).toBe(DEFAULT_SPEED);
    expect(PICTURE_SPEED).toBe(30);
    expect(CYCLE_UNITS / rate(DEFAULT_SPEED)).toBe(10);
    expect(CYCLE_UNITS / rate(PICTURE_SPEED)).toBe(2);
  });

  it('counts the step on the scrubber, never a time or a percentage', () => {
    expect(formatPhase(0)).toBe('Step 1 of 5');
    expect(formatPhase(PHASE_RANGES.echo[0])).toBe('Step 4 of 5');
    expect(formatPhase(CYCLE_UNITS - 1)).toBe('Step 5 of 5');
    PHASE_IDS.forEach((id) => expect(formatPhase(PHASE_RANGES[id][0])).not.toMatch(/%|ms/));
  });

  it('tells a screen reader which step of five is playing', () => {
    expect(describePhase(0)).toBe('Step 1 of 5, 90° pulse');
    expect(describePhase(PHASE_RANGES.refocus[0])).toBe('Step 3 of 5, 180° pulse');
  });

  it('shows the speed short on the slider and in full words for a screen reader', () => {
    expect(formatSpeed(6)).toBe('6/min');
    expect(describeSpeed(30)).toBe('30 repetitions per minute');
  });

  it('finds the moment a paused phase sits on', () => {
    MOMENT_IDS.forEach((id) => expect(momentAt(MOMENTS[id])).toBe(id));
    expect(momentAt(MOMENTS.pulse90 + 1)).toBeNull();
  });
});
