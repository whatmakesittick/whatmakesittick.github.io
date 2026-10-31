import { beforeAll, describe, expect, it } from 'vitest';
import { CARRIER_IDS } from '../ids';
import type { BenchmarkId, CoolingId, LoadId, MediumId } from '../ids';
import { MOMENTS, PHASE_RANGES } from '../model';
import { createDataCenterStore } from '../state';
import type { DataCenterStoreState } from '../state';
import { THEME } from '../theme';
import { DATA_CENTER_READOUTS } from './readouts';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { units, readouts } = TEST_LOCALE;
const METERED = ['rackPower', 'hallPower', 'return'];
const WORDED = ['joule'];

function row(id: string) {
  const found = DATA_CENTER_READOUTS.find((readout) => readout.id === id);
  if (!found) throw new Error(`No ${id} readout`);
  return found;
}

function text(id: string, state: DataCenterStoreState): string {
  return row(id).value(state);
}

function tone(id: string, state: DataCenterStoreState): string | undefined {
  return row(id).tone?.(state);
}

function share(id: string, state: DataCenterStoreState): number | undefined {
  return row(id).meter?.share(state);
}

function stateWith(cooling: CoolingId, load: LoadId, benchmark: BenchmarkId = 'average') {
  return createDataCenterStore({ cooling, load, benchmark, playing: false }).getState();
}

function stateAt(phase: number, cooling: CoolingId = 'liquid') {
  return createDataCenterStore({ phase, cooling, playing: false }).getState();
}

function celsius(value: string, medium: MediumId): string {
  return fill(units.celsiusOf, { value, medium: units.medium[medium] });
}

describe('gauge readouts', () => {
  beforeAll(() => initTestLocale());

  it('shows where the joule is, rack and hall power, the PUE and both coolant temperatures', () => {
    expect(DATA_CENTER_READOUTS.map((readout) => readout.id)).toEqual([
      'joule',
      'rackPower',
      'hallPower',
      'pue',
      'supply',
      'return',
    ]);
    DATA_CENTER_READOUTS.forEach((readout) => {
      expect(readout.labelKey).toBe(`readouts.${readout.id}`);
      expect(readout.numeric, readout.id).toBe(!WORDED.includes(readout.id));
      expect(readout.tone !== undefined, readout.id).toBe(WORDED.includes(readout.id));
      expect(readout.meter !== undefined, readout.id).toBe(METERED.includes(readout.id));
    });
  });

  it('names every carrier of the joule in English', () => {
    CARRIER_IDS.forEach((carrier) => expect(readouts.carrier[carrier], carrier).toBeTruthy());
    expect(Object.keys(readouts.carrier).sort()).toEqual([...CARRIER_IDS].sort());
  });

  it('follows the joule along the scrubber, amber as current and red as heat', () => {
    const { carrier } = readouts;
    expect(text('joule', stateAt(PHASE_RANGES.grid.start))).toBe(carrier.line);
    expect(tone('joule', stateAt(PHASE_RANGES.grid.start))).toBe(THEME.current);
    expect(text('joule', stateAt(MOMENTS.atRack))).toBe(carrier.busbar);
    expect(tone('joule', stateAt(MOMENTS.atRack))).toBe(THEME.current);
    expect(text('joule', stateAt(MOMENTS.becomesHeat))).toBe(carrier.chip);
    expect(tone('joule', stateAt(MOMENTS.becomesHeat))).toBe(THEME.heat);
    expect(text('joule', stateAt(MOMENTS.inCoolant))).toBe(carrier.water);
    expect(tone('joule', stateAt(MOMENTS.inCoolant))).toBe(THEME.heat);
  });

  it('carries the heat away in air in the air hall', () => {
    const air = stateAt(MOMENTS.inCoolant, 'air');
    expect(text('joule', air)).toBe(readouts.carrier.air);
    expect(tone('joule', air)).toBe(THEME.heat);
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
