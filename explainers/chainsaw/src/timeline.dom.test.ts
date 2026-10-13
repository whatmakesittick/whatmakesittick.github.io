import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import en from '../locales/en.json';
import { PHASE_IDS } from './ids';
import type { PhaseId } from './ids';
import { CYCLE_DEG, PHASE_RANGES, SPEED_RANGE, rate } from './model';
import { PHASE_TONES } from './theme';
import { fill } from './ui/testing';

const { value, during, speedValue, slower, phase } = en.timeline;
import {
  CHAINSAW_TIMELINE,
  describePhase,
  describeSpeed,
  formatPhase,
  formatSpeed,
} from './timeline';

describe('chainsaw timeline', () => {
  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  it('loops one crank turn through the four parts of the cycle', () => {
    const { phases, cycle, loop } = CHAINSAW_TIMELINE;
    expect(cycle).toBe(CYCLE_DEG);
    expect(loop).toBe(true);
    expect(phases.map((phase) => phase.id)).toEqual([...PHASE_IDS]);
    phases.forEach((phase) => {
      const [start, end] = PHASE_RANGES[phase.id as PhaseId];
      expect(phase).toMatchObject({ start, end, tone: PHASE_TONES[phase.id as PhaseId] });
      expect(phase.labelKey).toBe(`timeline.phase.${phase.id}`);
      expect(phase.jumpLabelKey).toBe(`timeline.jump.${phase.id}`);
    });
  });

  it('steps by one unit and nudges by 5 or 30', () => {
    expect(CHAINSAW_TIMELINE.step).toBe(1);
    expect(CHAINSAW_TIMELINE.nudge).toEqual({ fine: 5, coarse: 30 });
  });

  it('shows the share of the turn, never degrees', () => {
    expect(formatPhase(0)).toBe(fill(value, { share: '0' }));
    expect(formatPhase(90)).toBe(fill(value, { share: '25' }));
    expect(describePhase(180)).toBe(fill(during, { share: '50', phase: phase.scavenge }));
    expect(describePhase(50)).toContain(phase.power);
    [0, 90, 340].forEach((angle) => expect(describePhase(angle)).not.toContain('°'));
  });

  it('plays 512 times slower than life by default', () => {
    const { speed } = CHAINSAW_TIMELINE;
    expect(speed).toMatchObject({ min: 1, max: 6, step: 1 });
    expect(CHAINSAW_TIMELINE.rate(SPEED_RANGE.default)).toBe(rate(SPEED_RANGE.default));
    expect(formatSpeed(SPEED_RANGE.default)).toBe(fill(speedValue, { factor: '512' }));
    expect(formatSpeed(SPEED_RANGE.min)).toBe(fill(speedValue, { factor: '2,048' }));
    expect(describeSpeed(SPEED_RANGE.max)).toBe(fill(slower, { factor: '64' }));
  });
});
