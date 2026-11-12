import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import en from '../locales/en.json';
import { MACHINE_IDS, PHASE_IDS } from './ids';
import type { PhaseId } from './ids';
import {
  PHASE_RANGES,
  RUN_UNITS,
  SCAN_START_UNITS,
  SPEED_RANGE,
  rate,
  realSecondsAt,
} from './model';
import { PHASE_TONES } from './theme';
import {
  EUV_TIMELINE,
  describePhase,
  describeSpeed,
  formatClock,
  formatElapsed,
  formatPhase,
  formatSpeed,
} from './timeline';

const MAX_SPEED_LENGTH = 14;
const FLASH_START_SECONDS = -0.02;

function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => values[name] ?? '');
}

function unit(key: keyof typeof en.units, value: string): string {
  return fill(en.units[key], { value });
}

describe('euv timeline', () => {
  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  it('plays the 1000 unit run once through six stages with their tones', () => {
    const { phases, cycle, loop } = EUV_TIMELINE;
    expect(cycle).toBe(RUN_UNITS);
    expect(loop).toBe(false);
    expect(phases.map((part) => part.id)).toEqual([...PHASE_IDS]);
    phases.forEach((part) => {
      const id = part.id as PhaseId;
      expect(part).toMatchObject({ ...PHASE_RANGES[id], tone: PHASE_TONES[id] });
      expect(part.labelKey).toBe(`timeline.phase.${id}`);
      expect(part.jumpLabelKey).toBe(`timeline.jump.${id}`);
    });
  });

  it('reads the clock before and after the flash', () => {
    expect(formatClock(FLASH_START_SECONDS)).toBe(
      fill(en.clock.before, { value: unit('ms', '20') }),
    );
    expect(formatClock(0)).toBe(fill(en.clock.after, { value: unit('ns', '0') }));
    expect(formatClock(2.5e-6)).toBe(fill(en.clock.after, { value: unit('us', '2.5') }));
    expect(formatElapsed(3e-7)).toBe(unit('ns', '300'));
    expect(formatElapsed(0.05)).toBe(unit('ms', '50'));
    expect(formatElapsed(0.29)).toBe(unit('s', '0.29'));
  });

  it('starts 20 ms before the flash', () => {
    expect(formatPhase(0)).toBe('20 ms before the flash');
    expect(formatPhase(PHASE_RANGES.plasma.start)).toBe('0 ns after the flash');
  });

  it('keeps the time before the scan equal on every machine', () => {
    for (let units = 0; units <= SCAN_START_UNITS; units += 10) {
      const [first, ...others] = MACHINE_IDS.map((machine) => realSecondsAt(units, machine));
      others.forEach((seconds) => expect(seconds).toBeCloseTo(first, 15));
    }
  });

  it('shows the scan share after the flash lands', () => {
    const scanning = (percent: string) =>
      fill(en.clock.scan, {
        value: fill(en.units.percent, { value: percent }),
      });
    expect(formatPhase(RUN_UNITS)).toBe(scanning('100'));
    expect(formatPhase((SCAN_START_UNITS + RUN_UNITS) / 2)).toBe(scanning('50'));
    expect(describePhase(RUN_UNITS)).toContain(scanning('100'));
  });

  it('describes the stage by its number out of six and the clock', () => {
    PHASE_IDS.forEach((id, index) => {
      const text = describePhase(PHASE_RANGES[id].start);
      expect(text).toContain(`${index + 1} of 6`);
      expect(text).toContain(en.timeline.detail[id]);
    });
    expect(describePhase(0)).toBe(
      fill(en.timeline.during, {
        step: '1',
        total: '6',
        detail: en.timeline.detail.droplet,
        time: '20 ms before the flash',
      }),
    );
  });

  it('keeps every speed label short', () => {
    for (let speed = SPEED_RANGE.min; speed <= SPEED_RANGE.max; speed += 1) {
      expect(formatSpeed(speed).length).toBeLessThan(MAX_SPEED_LENGTH);
    }
    expect(formatSpeed(SPEED_RANGE.default)).toBe(fill(en.timeline.speedValue, { factor: '2' }));
  });

  it('plays the run in two minutes at the base speed', () => {
    expect(EUV_TIMELINE.rate).toBe(rate);
    expect(rate(1) * 120).toBeCloseTo(RUN_UNITS, 9);
    expect(describeSpeed(1)).toBe(fill(en.timeline.speedDescribe, { seconds: '120' }));
    expect(describeSpeed(SPEED_RANGE.max)).toBe(fill(en.timeline.speedDescribe, { seconds: '15' }));
  });
});
