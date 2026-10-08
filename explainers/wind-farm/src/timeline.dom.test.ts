import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import en from '../locales/en.json';
import { PHASE_IDS } from './ids';
import type { PhaseId } from './ids';
import { CYCLE_MINUTES, DEFAULT_SPEED, PHASE_RANGES, SPEED_RANGE, rate } from './model';
import { PHASE_TONES } from './theme';
import {
  WIND_FARM_TIMELINE,
  describePhase,
  describeSpeed,
  formatPhase,
  formatSpeed,
} from './timeline';

describe('wind farm timeline', () => {
  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  it('loops one day of minutes through the five parts of the day', () => {
    const { phases, cycle, loop } = WIND_FARM_TIMELINE;
    expect(cycle).toBe(CYCLE_MINUTES);
    expect(loop).toBe(true);
    expect(phases.map((phase) => phase.id)).toEqual([...PHASE_IDS]);
    phases.forEach((phase) => {
      const [start, end] = PHASE_RANGES[phase.id as PhaseId];
      expect(phase).toMatchObject({ start, end, tone: PHASE_TONES[phase.id as PhaseId] });
      expect(phase.labelKey).toBe(`timeline.phase.${phase.id}`);
      expect(phase.jumpLabelKey).toBe(`timeline.jump.${phase.id}`);
    });
    expect(phases[0].start).toBe(0);
    expect(phases.at(-1)?.end).toBe(cycle);
    phases.slice(1).forEach((phase, index) => expect(phase.start).toBe(phases[index].end));
  });

  it('steps by five minutes and nudges by a quarter hour or an hour', () => {
    expect(WIND_FARM_TIMELINE.step).toBe(5);
    expect(WIND_FARM_TIMELINE.nudge).toEqual({ fine: 15, coarse: 60 });
  });

  it('shows the clock time and names the part of the day', () => {
    expect(formatPhase(0)).toContain('00:00');
    expect(formatPhase(1148)).toContain('19:08');
    expect(describePhase(720)).toContain('12:00');
    expect(describePhase(720)).toContain(en.timeline.phase.afternoon);
    expect(describePhase(1000)).toContain(en.timeline.phase.storm);
  });

  it('plays the day at hours per reader minute', () => {
    const { speed } = WIND_FARM_TIMELINE;
    expect(speed).toMatchObject({ min: 1, max: 60, step: 1 });
    expect(SPEED_RANGE.default).toBe(DEFAULT_SPEED);
    expect(WIND_FARM_TIMELINE.rate(DEFAULT_SPEED)).toBe(rate(DEFAULT_SPEED));
    expect(formatSpeed(DEFAULT_SPEED)).toContain('12');
    expect(describeSpeed(DEFAULT_SPEED)).toContain('12');
  });
});
