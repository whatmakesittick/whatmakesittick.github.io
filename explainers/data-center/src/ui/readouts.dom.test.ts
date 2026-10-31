import { beforeAll, describe, expect, it } from 'vitest';
import type { BenchmarkId, CoolingId, LoadId, MediumId } from '../ids';
import { createDataCenterStore } from '../state';
import type { DataCenterStoreState } from '../state';
import { DATA_CENTER_READOUTS } from './readouts';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { units, readouts } = TEST_LOCALE;
const METERED = ['rackPower', 'hallPower', 'return'];

function row(id: string) {
  const found = DATA_CENTER_READOUTS.find((readout) => readout.id === id);
  if (!found) throw new Error(`No ${id} readout`);
  return found;
}

function text(id: string, state: DataCenterStoreState): string {
  return row(id).value(state);
}

function share(id: string, state: DataCenterStoreState): number | undefined {
  return row(id).meter?.share(state);
}

function stateWith(cooling: CoolingId, load: LoadId, benchmark: BenchmarkId = 'average') {
  return createDataCenterStore({ cooling, load, benchmark, playing: false }).getState();
}

function celsius(value: string, medium: MediumId): string {
  return fill(units.celsiusOf, { value, medium: units.medium[medium] });
}

describe('gauge readouts', () => {
  beforeAll(() => initTestLocale());

  it('shows rack and hall power, the PUE and both coolant temperatures', () => {
    expect(DATA_CENTER_READOUTS.map((readout) => readout.id)).toEqual([
      'rackPower',
      'hallPower',
      'pue',
      'supply',
      'return',
    ]);
    DATA_CENTER_READOUTS.forEach((readout) => {
      expect(readout.labelKey).toBe(`readouts.${readout.id}`);
      expect(readout.numeric).toBe(true);
      expect(readout.meter !== undefined, readout.id).toBe(METERED.includes(readout.id));
    });
  });

  it('starts with a liquid rack at full load and every meter full', () => {
    const start = createDataCenterStore().getState();
    expect(text('rackPower', start)).toBe(fill(units.kw, { value: '120' }));
    expect(text('hallPower', start)).toBe(fill(units.mw, { value: '23.0' }));
    expect(text('pue', start)).toBe(
      fill(units.pueOf, { value: '1.54', site: readouts.pueSite.average }),
    );
    expect(text('supply', start)).toBe(celsius('25.0', 'water'));
    expect(text('return', start)).toBe(celsius('45.0', 'water'));
    expect(share('rackPower', start)).toBeCloseTo(1, 9);
    expect(share('hallPower', start)).toBeCloseTo(1, 9);
    expect(share('return', start)).toBeCloseTo(1, 9);
  });

  it('drops to 30 percent of the power and a smaller rise at idle', () => {
    const idle = stateWith('liquid', 'idle');
    expect(text('rackPower', idle)).toBe(fill(units.kw, { value: '36' }));
    expect(text('hallPower', idle)).toBe(fill(units.mw, { value: '6.9' }));
    expect(text('return', idle)).toBe(celsius('31.0', 'water'));
    expect(share('rackPower', idle)).toBeCloseTo(0.3, 9);
    expect(share('hallPower', idle)).toBeCloseTo(0.3, 9);
    expect(share('return', idle)).toBeCloseTo(0.3, 9);
  });

  it('reads the air rack against the liquid scale, in air', () => {
    const full = stateWith('air', 'full');
    expect(text('rackPower', full)).toBe(fill(units.kw, { value: '10' }));
    expect(text('hallPower', full)).toBe(fill(units.mw, { value: '1.9' }));
    expect(text('supply', full)).toBe(celsius('24.0', 'air'));
    expect(text('return', full)).toBe(celsius('35.1', 'air'));
    expect(share('rackPower', full)).toBeCloseTo(10 / 120, 9);
    expect(share('return', full)).toBeCloseTo(11.1 / 20, 9);
    const idle = stateWith('air', 'idle');
    expect(text('rackPower', idle)).toBe(fill(units.kw, { value: '3' }));
    expect(text('hallPower', idle)).toBe(fill(units.mw, { value: '0.6' }));
    expect(text('return', idle)).toBe(celsius('30.7', 'air'));
  });

  it('switches the PUE to the best fleet without touching the cooling', () => {
    const best = stateWith('liquid', 'full', 'best');
    expect(text('pue', best)).toBe(
      fill(units.pueOf, { value: '1.09', site: readouts.pueSite.best }),
    );
    expect(text('return', best)).toBe(celsius('45.0', 'water'));
  });
});
