import { beforeAll, describe, expect, it } from 'vitest';
import { MOMENTS } from '../model';
import { createSwimStore } from '../state';
import type { SwimStoreState } from '../state';
import { DRAG_METER_MAX_N, SWIM_READOUTS } from './readouts';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { units, readouts } = TEST_LOCALE;
const UNDER_SHOULDER = MOMENTS.underShoulder;
const IN_AIR = MOMENTS.recoveryMid;

function state(phase: number, extra: Partial<SwimStoreState> = {}): SwimStoreState {
  return { ...createSwimStore().getState(), phase, ...extra };
}

function row(id: string) {
  const found = SWIM_READOUTS.find((entry) => entry.id === id);
  if (!found) throw new Error(`No ${id} row`);
  return found;
}

describe('gauge rows', () => {
  beforeAll(() => initTestLocale());

  it('lists the five rows in order', () => {
    expect(SWIM_READOUTS.map((entry) => entry.id)).toEqual([
      'speed',
      'strokeRate',
      'strokeLength',
      'handForce',
      'drag',
    ]);
  });

  it('shows the pace values', () => {
    expect(row('strokeRate').value(state(0))).toBe(fill(units.perMinute, { value: '42' }));
    expect(row('strokeLength').value(state(0, { pace: 'sprint' }))).toBe(
      fill(units.meters, { value: '2.10' }),
    );
  });

  it('moves speed and hand force with the scrubber', () => {
    expect(row('speed').value(state(0))).not.toBe(row('speed').value(state(UNDER_SHOULDER)));
    expect(row('handForce').value(state(UNDER_SHOULDER))).not.toBe(
      row('handForce').value(state(IN_AIR)),
    );
    expect(row('handForce').meter?.share(state(UNDER_SHOULDER))).toBeGreaterThan(0.3);
  });

  it('shows text instead of a multiplied force with the head up', () => {
    const up = state(0, { headUp: true });
    expect(row('drag').value(up)).toBe(readouts.dragUp);
    expect(row('drag').meter?.share(up)).toBe(1);
    expect(row('drag').value(state(0))).toBe(
      fill(units.newtons, { value: row('drag').value(state(0)).replace(/\D/g, '') }),
    );
    expect(DRAG_METER_MAX_N).toBe(150);
  });
});
