import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import en from '../locales/en.json';
import { PHASE_IDS } from './ids';
import type { PhaseId } from './ids';
import { MOMENTS, PHASE_RANGES, RUN_UNITS, SPEED_RANGE, rate } from './model';
import { PHASE_TONES } from './theme';
import {
  MAGLEV_TRAIN_TIMELINE,
  describePhase,
  describeSpeed,
  formatPhase,
  formatSpeed,
} from './timeline';

const { value, during, speedValue, speedDescribe, detail } = en.timeline;

function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => values[name] ?? '');
}

describe('maglev train timeline', () => {
  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  it('plays the 1000 unit ride once through its five stages', () => {
    const { phases, cycle, loop } = MAGLEV_TRAIN_TIMELINE;
    expect(cycle).toBe(RUN_UNITS);
    expect(cycle).toBe(1000);
    expect(loop).toBe(false);
    expect(phases.map((part) => part.id)).toEqual([...PHASE_IDS]);
    phases.forEach((part) => {
      const { start, end } = PHASE_RANGES[part.id as PhaseId];
      expect(part).toMatchObject({ start, end, tone: PHASE_TONES[part.id as PhaseId] });
      expect(part.labelKey).toBe(`timeline.phase.${part.id}`);
      expect(part.jumpLabelKey).toBe(`timeline.jump.${part.id}`);
    });
  });

  it('steps by one unit and nudges by 5 or 50', () => {
    expect(MAGLEV_TRAIN_TIMELINE.step).toBe(1);
    expect(MAGLEV_TRAIN_TIMELINE.nudge).toEqual({ fine: 5, coarse: 50 });
  });

  it('numbers the stage at each moment', () => {
    expect(formatPhase(0)).toBe(fill(value, { step: '1', total: '5' }));
    expect(formatPhase(MOMENTS.lifted)).toBe(fill(value, { step: '1', total: '5' }));
    expect(formatPhase(MOMENTS.fullSpeed)).toBe(fill(value, { step: '3', total: '5' }));
    expect(formatPhase(MOMENTS.brakeStart)).toBe(fill(value, { step: '4', total: '5' }));
    expect(formatPhase(MOMENTS.touchdown)).toBe(fill(value, { step: '5', total: '5' }));
    expect(formatPhase(RUN_UNITS)).toBe(fill(value, { step: '5', total: '5' }));
  });

  it('describes the stage by its number out of five', () => {
    expect(describePhase(0)).toBe(fill(during, { step: '1', total: '5', detail: detail.liftOff }));
    expect(describePhase(200)).toBe(
      fill(during, { step: '2', total: '5', detail: detail.accelerate }),
    );
    expect(describePhase(MOMENTS.fullSpeed)).toBe(
      fill(during, { step: '3', total: '5', detail: detail.cruise }),
    );
    expect(describePhase(MOMENTS.brakeStart)).toBe(
      fill(during, { step: '4', total: '5', detail: detail.brake }),
    );
    expect(describePhase(RUN_UNITS)).toBe(
      fill(during, { step: '5', total: '5', detail: detail.settle }),
    );
  });

  it('plays the whole ride in a minute by default', () => {
    const { speed } = MAGLEV_TRAIN_TIMELINE;
    expect(speed).toMatchObject({ min: 1, max: 32, step: 1 });
    expect(SPEED_RANGE.default).toBe(8);
    expect(MAGLEV_TRAIN_TIMELINE.rate).toBe(rate);
    expect(rate(SPEED_RANGE.default) * 60).toBeCloseTo(RUN_UNITS, 9);
    expect(formatSpeed(SPEED_RANGE.default)).toBe(fill(speedValue, { factor: '8' }));
    expect(describeSpeed(SPEED_RANGE.default)).toBe(fill(speedDescribe, { seconds: '60' }));
  });

  it('rounds the ride time to whole seconds', () => {
    expect(describeSpeed(SPEED_RANGE.min)).toBe(fill(speedDescribe, { seconds: '480' }));
    expect(describeSpeed(7)).toBe(fill(speedDescribe, { seconds: '69' }));
    expect(describeSpeed(SPEED_RANGE.max)).toBe(fill(speedDescribe, { seconds: '15' }));
  });
});
