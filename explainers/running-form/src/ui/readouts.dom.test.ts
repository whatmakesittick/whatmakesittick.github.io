import { beforeAll, describe, expect, it } from 'vitest';
import { createRunStore } from '../state';
import type { RunStoreState } from '../state';
import { MOMENTS } from '../model';
import { RUN_READOUTS } from './readouts';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { units, gauge } = TEST_LOCALE;

function state(phase: number, extra: Partial<RunStoreState> = {}): RunStoreState {
  return { ...createRunStore().getState(), phase, ...extra };
}

function row(id: string) {
  const found = RUN_READOUTS.find((entry) => entry.id === id);
  if (!found) throw new Error(`No ${id} row`);
  return found;
}

describe('gauge rows', () => {
  beforeAll(() => initTestLocale());

  it('lists the six rows in order', () => {
    expect(RUN_READOUTS.map((entry) => entry.id)).toEqual([
      'feet',
      'force',
      'knee',
      'cadence',
      'stepLength',
      'contact',
    ]);
    expect(row('feet').numeric).toBe(false);
  });

  it('shows the pace values', () => {
    expect(row('cadence').value(state(0))).toBe(fill(units.perMinute, { value: '170' }));
    expect(row('stepLength').value(state(0))).toBe(fill(units.meters, { value: '1.23' }));
    expect(row('contact').value(state(0))).toBe(fill(units.milliseconds, { value: '256' }));
    expect(row('cadence').value(state(0, { pace: 'fast' }))).toBe(
      fill(units.perMinute, { value: '180' }),
    );
  });

  it('follows the step rate', () => {
    expect(row('cadence').value(state(0, { stepRate: 10 }))).toBe(
      fill(units.perMinute, { value: '187' }),
    );
  });

  it('moves the feet, the force and the knee with the scrubber', () => {
    expect(row('feet').value(state(MOMENTS.touchdown))).toBe(gauge.feetRight);
    expect(row('feet').value(state(MOMENTS.midFloat))).toBe(gauge.feetAir);
    expect(row('feet').value(state(MOMENTS.leftTouchdown + 100))).toBe(gauge.feetLeft);
    expect(row('force').value(state(MOMENTS.peakForce))).not.toBe(row('force').value(state(0)));
    expect(row('knee').value(state(MOMENTS.midStance))).not.toBe(row('knee').value(state(0)));
    expect(row('force').meter?.share(state(MOMENTS.peakForce))).toBeGreaterThan(0.7);
    expect(row('force').meter?.share(state(MOMENTS.midFloat))).toBe(0);
  });
});
