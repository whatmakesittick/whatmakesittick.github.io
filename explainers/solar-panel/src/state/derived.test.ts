import { describe, expect, it } from 'vitest';
import { SUN_MOMENTS } from '../model';
import {
  cellTemperatureOf,
  energyOf,
  irradianceOf,
  minuteOf,
  powerOf,
  shadeAnalysisOf,
  shadeFactorOf,
  stringStatesOf,
} from './derived';
import { createSolarPanelStore } from './store';
import type { SolarPanelStoreState } from './store';

function stateWith(overrides: Partial<SolarPanelStoreState>): SolarPanelStoreState {
  return createSolarPanelStore(overrides).getState();
}

const NOON = SUN_MOMENTS.noon;

describe('derived panel values', () => {
  it('reads the solar time from the phase', () => {
    expect(minuteOf(stateWith({ phase: 0 }))).toBe(300);
    expect(minuteOf(stateWith({ phase: NOON }))).toBe(720);
  });

  it('puts about 973 W/m² on the 35° panel at noon and nothing at night (facts section 5)', () => {
    expect(irradianceOf(stateWith({ phase: NOON }))).toBeCloseTo(973, -1);
    expect(irradianceOf(stateWith({ phase: NOON, tilt: 0 }))).toBeCloseTo(764, -1);
    expect(irradianceOf(stateWith({ phase: 20 }))).toBe(0);
  });

  it('warms the cells to about 54 °C at noon unless the reader sets the temperature', () => {
    expect(cellTemperatureOf(stateWith({ phase: NOON }))).toBeCloseTo(53.8, 0);
    expect(cellTemperatureOf(stateWith({ phase: NOON, temperature: 10 }))).toBe(10);
  });

  it('gives about 375 W at noon, more from a cold cell and nothing at night', () => {
    expect(powerOf(stateWith({ phase: NOON }))).toBeCloseTo(375, -0.5);
    expect(powerOf(stateWith({ phase: NOON, temperature: 0 }))).toBeGreaterThan(420);
    expect(powerOf(stateWith({ phase: 830 }))).toBe(0);
  });

  it('halves the power of the half cut panel when the bottom row is in shadow', () => {
    const shaded = stateWith({ phase: NOON, shade: 0.35 });
    expect(shadeFactorOf(shaded)).toBeCloseTo(0.5, 1);
    expect(powerOf(shaded)).toBeCloseTo(powerOf(stateWith({ phase: NOON })) * 0.5, -1);
    expect(shadeFactorOf(stateWith({ phase: NOON }))).toBe(1);
  });

  it('adds up the energy of the day so far', () => {
    expect(energyOf(stateWith({ phase: 50 }))).toBe(0);
    expect(energyOf(stateWith({ phase: NOON }))).toBeGreaterThan(1300);
    expect(energyOf(stateWith({ phase: 839 }))).toBeGreaterThan(2650);
  });

  it('drops the lower strings under a low shadow and keeps all running in full sun', () => {
    expect(stringStatesOf(stateWith({ phase: NOON, shade: 0.35 })).deadStrings).toEqual([
      false,
      true,
      false,
      true,
      false,
      true,
    ]);
    const clear = stringStatesOf(stateWith({ phase: NOON, layout: 'fullCell' }));
    expect(clear).toEqual({
      deadStrings: [false, false, false],
      activeDiodes: [false, false, false],
    });
    expect(stringStatesOf(stateWith({ phase: 10 })).deadStrings.every(Boolean)).toBe(true);
  });

  it('reuses the last analysis while the light barely changes', () => {
    const first = shadeAnalysisOf(stateWith({ phase: NOON, shade: 0.3 }));
    const again = shadeAnalysisOf(stateWith({ phase: NOON + 0.2, shade: 0.3 }));
    expect(again).toBe(first);
  });
});
