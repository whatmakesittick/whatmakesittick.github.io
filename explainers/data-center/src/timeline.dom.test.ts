import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import en from '../locales/en.json';
import { PHASE_IDS } from './ids';
import type { PhaseId } from './ids';
import { MOMENTS, PHASE_RANGES, RUN_UNITS, SPEED_RANGE, rate } from './model';
import { THEME } from './theme';
import {
  DATA_CENTER_TIMELINE,
  describePhase,
  describeSpeed,
  formatElapsed,
  formatPhase,
  formatSpeed,
} from './timeline';

const { value, during, speedValue, speedDescribe, detail } = en.timeline;

const TONES: Readonly<Record<PhaseId, string>> = {
  grid: THEME.toneGrid,
  protect: THEME.toneProtect,
  distribute: THEME.toneDistribute,
  compute: THEME.toneCompute,
  cool: THEME.toneCool,
  release: THEME.toneRelease,
};

function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => values[name] ?? '');
}

function ns(text: string): string {
  return fill(en.units.ns, { value: text });
}

function us(text: string): string {
  return fill(en.units.us, { value: text });
}

function ms(text: string): string {
  return fill(en.units.ms, { value: text });
}

function s(text: string): string {
  return fill(en.units.s, { value: text });
}

describe('data center timeline', () => {
  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  it('plays the 1000 unit run once through its six stages', () => {
    const { phases, cycle, loop } = DATA_CENTER_TIMELINE;
    expect(cycle).toBe(RUN_UNITS);
    expect(cycle).toBe(1000);
    expect(loop).toBe(false);
    expect(phases.map((part) => part.id)).toEqual([...PHASE_IDS]);
    phases.forEach((part) => {
      const { start, end } = PHASE_RANGES[part.id as PhaseId];
      expect(part).toMatchObject({ start, end, tone: TONES[part.id as PhaseId] });
      expect(part.labelKey).toBe(`timeline.phase.${part.id}`);
      expect(part.jumpLabelKey).toBe(`timeline.jump.${part.id}`);
    });
  });

  it('steps by one unit and nudges by 5 or 50', () => {
    expect(DATA_CENTER_TIMELINE.step).toBe(1);
    expect(DATA_CENTER_TIMELINE.nudge).toEqual({ fine: 5, coarse: 50 });
  });

  it('writes whole nanoseconds, then microseconds and milliseconds with one decimal under 10', () => {
    expect(formatElapsed(0)).toBe(ns('0'));
    expect(formatElapsed(3e-7)).toBe(ns('300'));
    expect(formatElapsed(1e-6)).toBe(us('1.0'));
    expect(formatElapsed(2.59e-6)).toBe(us('2.6'));
    expect(formatElapsed(8.37e-5)).toBe(us('84'));
    expect(formatElapsed(9.8e-3)).toBe(ms('9.8'));
    expect(formatElapsed(0.01)).toBe(ms('10'));
    expect(formatElapsed(0.5)).toBe(ms('500'));
    expect(formatElapsed(1)).toBe(s('1'));
    expect(formatElapsed(40)).toBe(s('40'));
    expect(formatElapsed(59.6)).toBe(s('60'));
  });

  it('shows the model clock at each moment', () => {
    expect(formatPhase(0)).toBe(fill(value, { time: ns('0') }));
    expect(formatPhase(PHASE_RANGES.protect.start)).toBe(fill(value, { time: ns('300') }));
    expect(formatPhase(MOMENTS.atRack)).toBe(fill(value, { time: ns('700') }));
    expect(formatPhase(MOMENTS.becomesHeat)).toBe(fill(value, { time: us('61') }));
    expect(formatPhase(MOMENTS.inCoolant)).toBe(fill(value, { time: ms('10') }));
    expect(formatPhase(MOMENTS.onRoof)).toBe(fill(value, { time: s('40') }));
    expect(formatPhase(RUN_UNITS)).toBe(fill(value, { time: s('60') }));
  });

  it('describes the stage by its number out of six and the model clock', () => {
    expect(describePhase(0)).toBe(
      fill(during, { step: '1', total: '6', detail: detail.grid, time: ns('0') }),
    );
    expect(describePhase(200)).toBe(
      fill(during, { step: '2', total: '6', detail: detail.protect, time: ns('367') }),
    );
    expect(describePhase(PHASE_RANGES.distribute.start)).toBe(
      fill(during, { step: '3', total: '6', detail: detail.distribute, time: ns('500') }),
    );
    expect(describePhase(MOMENTS.atRack)).toBe(
      fill(during, { step: '4', total: '6', detail: detail.compute, time: ns('700') }),
    );
    expect(describePhase(MOMENTS.inCoolant)).toBe(
      fill(during, { step: '5', total: '6', detail: detail.cool, time: ms('10') }),
    );
    expect(describePhase(RUN_UNITS)).toBe(
      fill(during, { step: '6', total: '6', detail: detail.release, time: s('60') }),
    );
  });

  it('plays the whole run in a minute by default', () => {
    const { speed } = DATA_CENTER_TIMELINE;
    expect(speed).toMatchObject({ min: 1, max: 16, step: 1 });
    expect(SPEED_RANGE.default).toBe(4);
    expect(DATA_CENTER_TIMELINE.rate).toBe(rate);
    expect(rate(SPEED_RANGE.default) * 60).toBeCloseTo(RUN_UNITS, 9);
    expect(formatSpeed(SPEED_RANGE.default)).toBe(fill(speedValue, { factor: '4' }));
    expect(describeSpeed(SPEED_RANGE.default)).toBe(fill(speedDescribe, { seconds: '60' }));
  });

  it('rounds the run time to whole seconds', () => {
    expect(describeSpeed(SPEED_RANGE.min)).toBe(fill(speedDescribe, { seconds: '240' }));
    expect(describeSpeed(7)).toBe(fill(speedDescribe, { seconds: '34' }));
    expect(describeSpeed(SPEED_RANGE.max)).toBe(fill(speedDescribe, { seconds: '15' }));
  });
});
