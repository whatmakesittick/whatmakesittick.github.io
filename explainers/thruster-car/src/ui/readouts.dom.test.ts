import { beforeAll, describe, expect, it } from 'vitest';
import { RUN_BOOST_N, RUN_SECONDS } from '../model';
import { createThrusterCarStore } from '../state';
import type { ThrusterCarStoreState } from '../state';
import { THEME } from '../theme';
import { THRUSTER_CAR_READOUTS } from './readouts';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { units } = TEST_LOCALE;
const CATCH_SECONDS_IN = 6;
const AFTER_DRY_SECONDS = 7;
const FULL_THRUST_N = 32000;

function row(id: string) {
  const found = THRUSTER_CAR_READOUTS.find((readout) => readout.id === id);
  if (!found) throw new Error(`No ${id} readout`);
  return found;
}

function text(id: string, state: ThrusterCarStoreState): string {
  return row(id).value(state);
}

describe('gauge readouts', () => {
  beforeAll(() => initTestLocale());

  it('shows the tank, the jets, the gas flow and the car', () => {
    expect(THRUSTER_CAR_READOUTS.map((readout) => readout.id)).toEqual([
      'pressure',
      'thrust',
      'massFlow',
      'height',
      'speed',
      'gasLeft',
    ]);
    THRUSTER_CAR_READOUTS.forEach((readout) => {
      expect(readout.labelKey).toBe(`readouts.${readout.id}`);
      expect(readout.numeric).toBe(true);
    });
    expect(THRUSTER_CAR_READOUTS.filter((readout) => readout.meter).map((r) => r.id)).toEqual([
      'pressure',
      'thrust',
      'gasLeft',
    ]);
  });

  it('starts with a full tank and the rear jets pushing from a standstill', () => {
    const start = createThrusterCarStore({ phase: 0, playing: false }).getState();
    expect(text('pressure', start)).toBe(fill(units.bar, { value: '700' }));
    expect(row('pressure').meter?.share(start)).toBe(1);
    expect(text('thrust', start)).toBe(fill(units.kilonewtons, { value: '9.1' }));
    expect(row('thrust').meter?.share(start)).toBeCloseTo(RUN_BOOST_N / FULL_THRUST_N, 9);
    expect(text('massFlow', start)).toBe(fill(units.kgPerSecond, { value: '13.0' }));
    expect(text('height', start)).toBe(fill(units.metres, { value: '0.0' }));
    expect(text('speed', start)).toBe(fill(units.kmh, { value: '0' }));
    expect(text('gasLeft', start)).toBe(fill(units.percent, { value: '100' }));
    expect(row('gasLeft').tone?.(start)).toBe(THEME.text);
  });

  it('follows the catch and the end of the run as the phase is scrubbed', () => {
    const store = createThrusterCarStore({ playing: false });
    store.getState().setPhase(CATCH_SECONDS_IN);
    expect(text('thrust', store.getState())).toBe(fill(units.kilonewtons, { value: '28.1' }));
    expect(text('massFlow', store.getState())).toBe(fill(units.kgPerSecond, { value: '40.3' }));
    expect(text('height', store.getState())).toBe(fill(units.metres, { value: '2.1' }));
    store.getState().setPhase(RUN_SECONDS);
    expect(text('thrust', store.getState())).toBe(fill(units.kilonewtons, { value: '0.0' }));
    expect(text('speed', store.getState())).toBe(fill(units.kmh, { value: '0' }));
    expect(text('gasLeft', store.getState())).toBe(fill(units.percent, { value: '74' }));
    expect(text('pressure', store.getState())).toBe(fill(units.bar, { value: '286' }));
  });

  it('turns the gas gauge red and stops the jets once helium in the small tank runs dry', () => {
    const store = createThrusterCarStore({ playing: false, gas: 'helium', tankLitres: 400 });
    store.getState().setPhase(AFTER_DRY_SECONDS);
    const state = store.getState();
    expect(row('gasLeft').tone?.(state)).toBe(THEME.empty);
    expect(text('gasLeft', state)).toBe(fill(units.percent, { value: '19' }));
    expect(text('thrust', state)).toBe(fill(units.kilonewtons, { value: '0.0' }));
    expect(row('thrust').meter?.share(state)).toBe(0);
  });
});
