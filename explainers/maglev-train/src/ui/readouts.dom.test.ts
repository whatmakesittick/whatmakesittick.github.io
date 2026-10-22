import { beforeAll, describe, expect, it } from 'vitest';
import { LINE_M, MOMENTS, PROFILES, RUN_UNITS } from '../model';
import { createMaglevTrainStore } from '../state';
import type { MaglevTrainStoreState } from '../state';
import { MAGLEV_TRAIN_READOUTS } from './readouts';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { units } = TEST_LOCALE;

function row(id: string) {
  const found = MAGLEV_TRAIN_READOUTS.find((readout) => readout.id === id);
  if (!found) throw new Error(`No ${id} readout`);
  return found;
}

function text(id: string, state: MaglevTrainStoreState): string {
  return row(id).value(state);
}

function share(id: string, state: MaglevTrainStoreState): number | undefined {
  return row(id).meter?.share(state);
}

function clock(minutes: string, seconds: string): string {
  return fill(units.clock, { minutes, seconds });
}

function clockOf(elapsed: string, total: string): string {
  return fill(units.clockOf, { elapsed, total });
}

function stateAt(phase: number, overrides: Partial<MaglevTrainStoreState> = {}) {
  return createMaglevTrainStore({ phase, playing: false, ...overrides }).getState();
}

describe('gauge readouts', () => {
  beforeAll(() => initTestLocale());

  it('shows the speed, the distance, the clock and the magnet gap, each with a meter', () => {
    expect(MAGLEV_TRAIN_READOUTS.map((readout) => readout.id)).toEqual([
      'speed',
      'distance',
      'time',
      'gap',
    ]);
    MAGLEV_TRAIN_READOUTS.forEach((readout) => {
      expect(readout.labelKey).toBe(`readouts.${readout.id}`);
      expect(readout.numeric).toBe(true);
      expect(readout.meter).toBeDefined();
    });
  });

  it('starts at the platform, standing on the skids', () => {
    const start = stateAt(0);
    expect(text('speed', start)).toBe(fill(units.kmh, { value: '0' }));
    expect(text('distance', start)).toBe(fill(units.kmOf, { value: '0.0', total: '30' }));
    expect(text('time', start)).toBe(clockOf(clock('0', '00'), clock('7', '29')));
    expect(text('gap', start)).toBe(units.onSkids);
    expect(share('speed', start)).toBe(0);
    expect(share('distance', start)).toBe(0);
    expect(share('time', start)).toBe(0);
    expect(share('gap', start)).toBe(0);
  });

  it('reads the 10 mm gap and fills the lift meter once the train floats', () => {
    const lifted = stateAt(MOMENTS.lifted);
    expect(text('gap', lifted)).toBe(fill(units.mm, { value: '10.0' }));
    expect(share('gap', lifted)).toBeCloseTo(1, 9);
    expect(text('speed', lifted)).toBe(fill(units.kmh, { value: '0' }));
  });

  it('fills the speed meter at top speed and follows the scrubbed phase', () => {
    const store = createMaglevTrainStore({ phase: 0, playing: false });
    store.getState().setPhase(MOMENTS.fullSpeed);
    const fast = store.getState();
    expect(text('speed', fast)).toBe(fill(units.kmh, { value: '430' }));
    expect(share('speed', fast)).toBeCloseTo(1, 9);
    expect(text('distance', fast)).toBe(fill(units.kmOf, { value: '15.5', total: '30' }));
    expect(text('time', fast)).toBe(clockOf(clock('3', '49'), clock('7', '29')));
    expect(share('distance', fast)).toBeCloseTo(PROFILES.kmh430.accelMetres / LINE_M, 9);
  });

  it('ends at the airport with the trip clock full', () => {
    const end = stateAt(RUN_UNITS);
    expect(text('speed', end)).toBe(fill(units.kmh, { value: '0' }));
    expect(text('distance', end)).toBe(fill(units.kmOf, { value: '30.0', total: '30' }));
    expect(text('time', end)).toBe(clockOf(clock('7', '29'), clock('7', '29')));
    expect(text('gap', end)).toBe(units.onSkids);
    expect(share('gap', end)).toBe(0);
    expect(share('distance', end)).toBe(1);
    expect(share('time', end)).toBeCloseTo(1, 9);
  });

  it('scales the speed meter and the clock to 300 km/h', () => {
    const fast = stateAt(MOMENTS.fullSpeed, { topSpeed: 'kmh300' });
    expect(text('speed', fast)).toBe(fill(units.kmh, { value: '300' }));
    expect(share('speed', fast)).toBeCloseTo(1, 9);
    expect(text('distance', fast)).toBe(fill(units.kmOf, { value: '5.0', total: '30' }));
    expect(text('time', fast)).toBe(clockOf(clock('2', '06'), clock('8', '16')));
    const end = stateAt(RUN_UNITS, { topSpeed: 'kmh300' });
    expect(text('time', end)).toBe(clockOf(clock('8', '16'), clock('8', '16')));
  });
});
