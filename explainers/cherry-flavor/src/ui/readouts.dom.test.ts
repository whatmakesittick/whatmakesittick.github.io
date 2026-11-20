import { beforeAll, describe, expect, it } from 'vitest';
import { MOMENTS, unitsAt } from '../model';
import { createFlavorStore } from '../state';
import { FLAVOR_READOUTS, temperatureShare } from './readouts';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { units, readouts, percept, smells } = TEST_LOCALE;

function valueAt(id: string, phase: number): string {
  const readout = FLAVOR_READOUTS.find((entry) => entry.id === id);
  if (!readout) throw new Error(`No ${id} readout`);
  return readout.value({ ...createFlavorStore().getState(), phase });
}

describe('gauge readouts', () => {
  beforeAll(() => initTestLocale());

  it('shows the bite temperature until the swallow', () => {
    expect(valueAt('temperature', unitsAt(-1))).toBe(fill(units.celsius, { value: '−12' }));
    expect(valueAt('temperature', MOMENTS.swallow)).toBe(readouts.swallowed);
  });

  it('fills the temperature meter from the coldest serving to the mouth', () => {
    expect(temperatureShare(-14)).toBe(0);
    expect(temperatureShare(37)).toBe(1);
  });

  it('reports aroma and what you notice', () => {
    expect(valueAt('aroma', unitsAt(-1))).toBe(fill(units.percent, { value: '0' }));
    expect(valueAt('perceived', MOMENTS.firing)).toBe(
      fill(percept.flavor, { smell: smells.cherry }),
    );
  });
});
