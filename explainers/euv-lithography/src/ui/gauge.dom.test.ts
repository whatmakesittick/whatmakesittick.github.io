import { beforeAll, describe, expect, it } from 'vitest';
import en from '../../locales/en.json';
import { initI18n } from '@core/i18n';
import type { MachineId } from '../ids';
import { createEuvStore } from '../state';
import { EUV_READOUTS } from './readouts';

const ROWS = ['where', 'lightLeft', 'wavelength', 'dropletRate', 'smallestLine', 'wafersPerHour'];
const FIRST_PHASE = 520;
const MIDDLE_PHASE = 700;
const LAST_PHASE = 1000;

function row(id: string) {
  const found = EUV_READOUTS.find((readout) => readout.id === id);
  if (!found) throw new Error(`No ${id} readout`);
  return found;
}

function text(id: string, phase: number, machine: MachineId = 'nxe3600d'): string {
  return row(id).value(createEuvStore({ phase, machine, playing: false }).getState());
}

describe('euv gauge readouts', () => {
  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  it('shows six rows in order', () => {
    expect(EUV_READOUTS.map((readout) => readout.id)).toEqual(ROWS);
    EUV_READOUTS.forEach((readout) => expect(readout.labelKey).toContain(readout.id));
  });

  it('moves the place of the flash with the scrubber', () => {
    const places = [0, 200, 300, 400, FIRST_PHASE, LAST_PHASE].map((phase) => text('where', phase));
    expect(new Set(places).size).toBeGreaterThan(4);
    expect(text('where', 0)).toBe(en.readouts.place.generator);
    expect(text('where', LAST_PHASE)).toBe(en.readouts.place.wafer);
  });

  it('counts the light left down with every mirror', () => {
    const readings = [FIRST_PHASE, MIDDLE_PHASE, LAST_PHASE].map((phase) =>
      text('lightLeft', phase),
    );
    expect(new Set(readings).size).toBe(readings.length);
    expect(readings[2]).toBe('2.0%');
  });

  it('states the wavelength', () => {
    expect(text('wavelength', 0)).toBe('13.5 nm');
  });

  it('says exactly or more for the droplet rate by machine', () => {
    expect(text('dropletRate', 0, 'nxe3600d')).toBe('50,000');
    expect(text('dropletRate', 0, 'exe5000')).toBe('50,000 or more');
    expect(row('dropletRate').labelKey).toBe('readouts.dropletRate');
  });

  it('shrinks the finest line on the high-NA machine', () => {
    const coarse = Number.parseFloat(text('smallestLine', 0, 'nxe3600d'));
    const fine = Number.parseFloat(text('smallestLine', 0, 'exe5000'));
    expect(fine).toBeLessThan(coarse);
  });

  it('writes the wafer rate as about for the exe5000 only', () => {
    expect(text('wafersPerHour', 0, 'exe5000')).toContain('about');
    expect(text('wafersPerHour', 0, 'nxe3600d')).toContain('an hour');
    expect(text('wafersPerHour', 0, 'nxe3600d')).not.toContain('about');
  });
});
