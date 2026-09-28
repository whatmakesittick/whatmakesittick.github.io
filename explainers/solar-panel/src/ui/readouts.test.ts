import { describe, expect, it } from 'vitest';
import { SUN_MOMENTS } from '../model';
import { createSolarPanelStore } from '../state';
import type { SolarPanelStoreState } from '../state';
import { SOLAR_PANEL_READOUTS } from './readouts';

function readout(id: string) {
  const found = SOLAR_PANEL_READOUTS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No readout ${id}`);
  return found;
}

function stateWith(overrides: Partial<SolarPanelStoreState>): SolarPanelStoreState {
  return createSolarPanelStore(overrides).getState();
}

describe('gauge readouts', () => {
  it('shows the sun, the light, the power, the cell temperature and the energy in that order', () => {
    expect(SOLAR_PANEL_READOUTS.map((row) => row.id)).toEqual([
      'sun',
      'irradiance',
      'power',
      'temperature',
      'energy',
    ]);
  });

  it('tints a low sun in the dawn tone and a high sun in the noon tone', () => {
    const { tone } = readout('sun');
    expect(tone?.(stateWith({ phase: SUN_MOMENTS.sunrise }))).toBe('var(--dawn)');
    expect(tone?.(stateWith({ phase: SUN_MOMENTS.noon }))).toBe('var(--noon)');
    expect(tone?.(stateWith({ phase: 200 }))).toBe('var(--text)');
  });

  it('fills the light meter against test sun and the power meter against the label', () => {
    const noon = stateWith({ phase: SUN_MOMENTS.noon });
    expect(readout('irradiance').meter?.share(noon)).toBeCloseTo(0.973, 2);
    expect(readout('power').meter?.share(noon)).toBeCloseTo(375 / 420, 1);
    expect(readout('power').meter?.share(stateWith({ phase: 10 }))).toBe(0);
  });

  it('marks a cell hotter than 60 °C', () => {
    const { tone } = readout('temperature');
    expect(tone?.(stateWith({ phase: SUN_MOMENTS.noon }))).toBe('var(--text)');
    expect(tone?.(stateWith({ temperature: 65 }))).toBe('var(--warn)');
  });
});
