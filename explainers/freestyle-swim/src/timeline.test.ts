import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import { PHASE_IDS } from './ids';
import { CYCLE_UNITS, MOMENTS, PHASE_RANGES, cycleSeconds } from './model';
import { SWIM_TIMELINE_BASE, createSwimTimeline, describeSpeed, formatSpeed } from './timeline';

const TEXTS = {
  timeline: {
    value: '{{percent}} %',
    during: '{{percent}} %, {{phase}}',
    speedValue: '{{factor}}x',
    realTime: 'real time',
    slower: '{{factor}} times slower',
    phase: { entryCatch: 'entry', pull: 'pull', push: 'push', recovery: 'recovery' },
  },
};

describe('swim timeline', () => {
  beforeAll(() => initI18n({ en: () => Promise.resolve(TEXTS) }));

  it('loops one cycle in four bands that cover it', () => {
    expect(SWIM_TIMELINE_BASE).toMatchObject({ cycle: CYCLE_UNITS, loop: true, step: 2 });
    expect(SWIM_TIMELINE_BASE.nudge).toEqual({ fine: 5, coarse: 50 });
    expect(SWIM_TIMELINE_BASE.phases.map((phase) => phase.id)).toEqual([...PHASE_IDS]);
    SWIM_TIMELINE_BASE.phases.forEach((phase) => {
      expect(phase.start).toBe(PHASE_RANGES[phase.id as keyof typeof PHASE_RANGES].start);
    });
  });

  it('plays one cycle in the real cycle time of the pace', () => {
    expect(createSwimTimeline(() => 'easy').rate(3)).toBeCloseTo(
      CYCLE_UNITS / cycleSeconds('easy'),
    );
    expect(createSwimTimeline(() => 'sprint').rate(3)).toBeCloseTo(1000);
    expect(createSwimTimeline(() => 'sprint').rate(1)).toBeCloseTo(250);
  });

  it('reads the pace for the rate, the inputs and the phase names', () => {
    let pace: 'easy' | 'sprint' = 'easy';
    const timeline = createSwimTimeline(() => pace);
    const easyRate = timeline.rate(3);
    expect(timeline.formatInputs?.()).toEqual(['easy']);
    expect(timeline.describePhase(300)).toBe('30 %, entry');
    pace = 'sprint';
    expect(timeline.describePhase(300)).toBe('30 %, pull');
    expect(timeline.formatInputs?.()).toEqual(['sprint']);
    expect(timeline.rate(3)).toBeGreaterThan(easyRate);
  });

  it('shows the share of the cycle', () => {
    expect(SWIM_TIMELINE_BASE.formatPhase(370)).toBe('37 %');
    expect(SWIM_TIMELINE_BASE.describePhase(MOMENTS.pushEnd - 10)).toBe('74 %, push');
  });

  it('formats the speed as slow motion of real time', () => {
    expect(formatSpeed(0)).toBe('0.125x');
    expect(formatSpeed(3)).toBe('1x');
    expect(describeSpeed(3)).toBe('real time');
    expect(describeSpeed(0)).toBe('8 times slower');
    expect(describeSpeed(2)).toBe('2 times slower');
  });
});
