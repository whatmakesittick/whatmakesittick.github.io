import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import { PHASE_IDS } from './ids';
import { CYCLE_UNITS, MOMENTS, PHASE_RANGES, strideTimeS } from './model';
import {
  RUN_TIMELINE_BASE,
  createRunTimeline,
  describeSpeed,
  formatPlaybackSpeed,
} from './timeline';

const TEXTS = {
  timeline: {
    value: '{{percent}} %',
    during: '{{percent}} %, {{phase}}',
    speedValue: '{{factor}}x',
    realTime: 'real time',
    slower: '{{factor}} times slower',
    phase: { landing: 'landing', pushOff: 'push-off', recovery: 'recovery', reach: 'reach' },
  },
};

describe('run timeline', () => {
  beforeAll(() => initI18n({ en: () => Promise.resolve(TEXTS) }));

  it('loops one cycle in four bands that cover it', () => {
    expect(RUN_TIMELINE_BASE).toMatchObject({ cycle: CYCLE_UNITS, loop: true, step: 2 });
    expect(RUN_TIMELINE_BASE.nudge).toEqual({ fine: 5, coarse: 50 });
    expect(RUN_TIMELINE_BASE.phases.map((phase) => phase.id)).toEqual([...PHASE_IDS]);
    RUN_TIMELINE_BASE.phases.forEach((phase) => {
      const range = PHASE_RANGES[phase.id as keyof typeof PHASE_RANGES];
      expect([phase.start, phase.end]).toEqual([range.start, range.end]);
    });
  });

  it('plays one stride in the real stride time of the pace and step rate', () => {
    const real = createRunTimeline(
      () => 'easy',
      () => 0,
    );
    expect(real.rate(4)).toBeCloseTo(CYCLE_UNITS / strideTimeS('easy', 0));
    expect(real.rate(2)).toBeCloseTo(real.rate(4) / 4);
    const quick = createRunTimeline(
      () => 'easy',
      () => 10,
    );
    expect(quick.rate(4)).toBeGreaterThan(real.rate(4));
  });

  it('reads the pace and the step rate for the inputs and the phase names', () => {
    let pace: 'easy' | 'fast' = 'easy';
    let stepRate = 0;
    const timeline = createRunTimeline(
      () => pace,
      () => stepRate,
    );
    expect(timeline.formatInputs?.()).toEqual(['easy', 0]);
    expect(timeline.describePhase(420)).toBe('42 %, recovery');
    pace = 'fast';
    stepRate = 5;
    expect(timeline.describePhase(345)).toBe('35 %, recovery');
    expect(timeline.formatInputs?.()).toEqual(['fast', 5]);
  });

  it('shows the share of the cycle', () => {
    expect(RUN_TIMELINE_BASE.formatPhase(370)).toBe('37 %');
    expect(RUN_TIMELINE_BASE.describePhase(MOMENTS.touchdown)).toBe('0 %, landing');
  });

  it('formats the speed as slow motion of real time', () => {
    expect(formatPlaybackSpeed(0)).toBe('0.0625x');
    expect(formatPlaybackSpeed(1)).toBe('0.125x');
    expect(formatPlaybackSpeed(2)).toBe('0.25x');
    expect(formatPlaybackSpeed(4)).toBe('1x');
    expect(describeSpeed(4)).toBe('real time');
    expect(describeSpeed(0)).toBe('16 times slower');
    expect(describeSpeed(2)).toBe('4 times slower');
  });
});
