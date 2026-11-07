import { beforeAll, describe, expect, it } from 'vitest';
import { isLooping } from '@core/explainer';
import { initI18n } from '@core/i18n';
import { PHASE_IDS } from './ids';
import type { PhaseId } from './ids';
import {
  CYCLE_UNITS,
  HOLD_MS,
  MOMENTS,
  PHASE_RANGES,
  REAL_RING_SPEED,
  SPEED_RANGE,
  loopSeconds,
  rate,
  toSeconds,
} from './model';
import { PHASE_TONES } from './theme';
import { PIANO_TIMELINE, describePhase, describeSpeed, formatPhase, formatSpeed } from './timeline';

const detail: Readonly<Record<PhaseId, string>> = {
  press: 'the key goes down',
  escape: 'the jack slips away',
  strike: 'the hammer hits the string',
  check: 'the note rings',
  release: 'the key comes back up',
};

const timeline = {
  value: 'Step {{step}} of {{total}}',
  during: 'Step {{step}} of {{total}}, {{detail}}',
  speedValue: '{{seconds}} s per stroke',
  speedDescribe: 'One key stroke every {{seconds}} seconds',
  speedDescribeReal: 'One key stroke every {{seconds}} seconds, with the note ringing at real pace',
  detail,
};

const { value, during, speedValue, speedDescribe, speedDescribeReal } = timeline;

function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => values[name] ?? '');
}

describe('piano timeline', () => {
  beforeAll(() => initI18n({ en: () => Promise.resolve({ timeline }) }));

  it('loops the 1000 unit key stroke through its five steps', () => {
    const { phases, cycle } = PIANO_TIMELINE;
    expect(cycle).toBe(CYCLE_UNITS);
    expect(cycle).toBe(1000);
    expect(isLooping(PIANO_TIMELINE)).toBe(true);
    expect(PIANO_TIMELINE.loop).toBeUndefined();
    expect(phases.map((part) => part.id)).toEqual([...PHASE_IDS]);
    phases.forEach((part) => {
      const { start, end } = PHASE_RANGES[part.id as PhaseId];
      expect(part).toMatchObject({ start, end, tone: PHASE_TONES[part.id as PhaseId] });
      expect(part.labelKey).toBe(`timeline.phase.${part.id}`);
      expect(part.jumpLabelKey).toBe(`timeline.jump.${part.id}`);
    });
  });

  it('steps by one unit and nudges by 5 or 50', () => {
    expect(PIANO_TIMELINE.step).toBe(1);
    expect(PIANO_TIMELINE.nudge).toEqual({ fine: 5, coarse: 50 });
  });

  it('numbers the step at each moment', () => {
    expect(formatPhase(0)).toBe(fill(value, { step: '1', total: '5' }));
    expect(formatPhase(MOMENTS.jackTouch)).toBe(fill(value, { step: '2', total: '5' }));
    expect(formatPhase(MOMENTS.letOff)).toBe(fill(value, { step: '2', total: '5' }));
    expect(formatPhase(MOMENTS.strike)).toBe(fill(value, { step: '3', total: '5' }));
    expect(formatPhase(MOMENTS.checked)).toBe(fill(value, { step: '4', total: '5' }));
    expect(formatPhase(MOMENTS.repeatReady)).toBe(fill(value, { step: '5', total: '5' }));
    expect(formatPhase(MOMENTS.damped)).toBe(fill(value, { step: '5', total: '5' }));
    expect(formatPhase(CYCLE_UNITS)).toBe(fill(value, { step: '1', total: '5' }));
  });

  it('describes the step by its number out of five', () => {
    PHASE_IDS.forEach((id, index) =>
      expect(describePhase(PHASE_RANGES[id].start), id).toBe(
        fill(during, { step: String(index + 1), total: '5', detail: detail[id] }),
      ),
    );
    expect(describePhase(500)).toBe(fill(during, { step: '3', total: '5', detail: detail.strike }));
  });

  it('plays one stroke in 32, 16, 8 or 4 seconds', () => {
    const { speed } = PIANO_TIMELINE;
    expect(speed).toMatchObject({ min: 0, max: 3, step: 1 });
    expect(SPEED_RANGE.default).toBe(2);
    expect(PIANO_TIMELINE.rate).toBe(rate);
    expect([0, 1, 2, 3].map(loopSeconds)).toEqual([32, 16, 8, 4]);
    expect(rate(SPEED_RANGE.default) * loopSeconds(SPEED_RANGE.default)).toBeCloseTo(
      CYCLE_UNITS,
      9,
    );
    expect(formatSpeed(SPEED_RANGE.min)).toBe(fill(speedValue, { seconds: '32' }));
    expect(formatSpeed(SPEED_RANGE.max)).toBe(fill(speedValue, { seconds: '4' }));
  });

  it('rings the note at real pace at the default speed', () => {
    const { start, end } = PHASE_RANGES.check;
    expect(REAL_RING_SPEED).toBe(SPEED_RANGE.default);
    expect((end - start) / rate(REAL_RING_SPEED)).toBeCloseTo(toSeconds(HOLD_MS), 9);
    expect(describeSpeed(REAL_RING_SPEED)).toBe(fill(speedDescribeReal, { seconds: '8' }));
    expect(describeSpeed(1)).toBe(fill(speedDescribe, { seconds: '16' }));
    expect(describeSpeed(SPEED_RANGE.max)).toBe(fill(speedDescribe, { seconds: '4' }));
  });
});
