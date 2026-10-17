import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import en from '../locales/en.json';
import { PHASE_IDS } from './ids';
import type { PhaseId } from './ids';
import { MOMENTS, PHASE_RANGES, RUN_SECONDS, SPEED_RANGE, rate } from './model';
import { PHASE_TONES } from './theme';
import {
  THRUSTER_CAR_TIMELINE,
  describePhase,
  describeSpeed,
  formatPhase,
  formatSpeed,
} from './timeline';

const { value, during, speedValue, speedDescribe, detail } = en.timeline;

function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => values[name] ?? '');
}

describe('thruster car timeline', () => {
  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  it('plays the 14 s run once through its six parts', () => {
    const { phases, cycle, loop } = THRUSTER_CAR_TIMELINE;
    expect(cycle).toBe(RUN_SECONDS);
    expect(loop).toBe(false);
    expect(phases.map((part) => part.id)).toEqual([...PHASE_IDS]);
    phases.forEach((part) => {
      const { start, end } = PHASE_RANGES[part.id as PhaseId];
      expect(part).toMatchObject({ start, end, tone: PHASE_TONES[part.id as PhaseId] });
      expect(part.labelKey).toBe(`timeline.phase.${part.id}`);
      expect(part.jumpLabelKey).toBe(`timeline.jump.${part.id}`);
    });
  });

  it('steps by a tenth of a second and nudges by half a second or one', () => {
    expect(THRUSTER_CAR_TIMELINE.step).toBe(0.1);
    expect(THRUSTER_CAR_TIMELINE.nudge).toEqual({ fine: 0.5, coarse: 1 });
  });

  it('shows the run time to a tenth of a second and names the part', () => {
    expect(formatPhase(0)).toBe(fill(value, { seconds: '0.0' }));
    expect(formatPhase(MOMENTS.inverted)).toBe(fill(value, { seconds: '4.1' }));
    expect(describePhase(4)).toBe(fill(during, { seconds: '4.0', phase: detail.ramp }));
    expect(describePhase(5)).toBe(fill(during, { seconds: '5.0', phase: detail.flip }));
    expect(describePhase(RUN_SECONDS)).toBe(fill(during, { seconds: '17.0', phase: detail.rest }));
  });

  it('plays in real time by default as a plain speed factor', () => {
    const { speed } = THRUSTER_CAR_TIMELINE;
    expect(speed).toMatchObject({ min: 0.25, max: 2, step: 0.25 });
    expect(THRUSTER_CAR_TIMELINE.rate(SPEED_RANGE.default)).toBe(rate(SPEED_RANGE.default));
    expect(formatSpeed(SPEED_RANGE.default)).toBe(fill(speedValue, { factor: '1' }));
    expect(formatSpeed(SPEED_RANGE.min)).toBe(fill(speedValue, { factor: '0.25' }));
    expect(describeSpeed(SPEED_RANGE.max)).toBe(fill(speedDescribe, { factor: '2' }));
  });
});
