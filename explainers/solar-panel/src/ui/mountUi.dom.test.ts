import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import { mountActions } from '@core/ui/actions';
import chapters from '../../chapters.html?raw';
import en from '../../locales/en.json';
import { SUN_MOMENTS } from '../model';
import { createSolarPanelStore } from '../state';
import type { SolarPanelStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { mountSolarPanelUi } from '.';

function readout(id: string): string | null | undefined {
  return document.querySelector(`[data-readout="${id}"]`)?.textContent;
}

function click(action: string, value?: string): void {
  const selector = value
    ? `[data-action="${action}"][data-value="${value}"]`
    : `[data-action="${action}"]`;
  document.querySelector<HTMLElement>(selector)?.click();
}

function slide(control: string, value: number): void {
  const input = document.querySelector<HTMLInputElement>(`[data-control="${control}"]`);
  if (!input) throw new Error(`No control ${control}`);
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
}

function pressed(action: string, value: string): string | null | undefined {
  return document
    .querySelector(`[data-action="${action}"][data-value="${value}"]`)
    ?.getAttribute('aria-pressed');
}

describe('chapter widgets', () => {
  let store: SolarPanelStore;
  let dispose: () => void;

  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  beforeEach(() => {
    document.body.innerHTML = chapters;
    store = createSolarPanelStore({ playing: false, phase: SUN_MOMENTS.noon });
    dispose = mountSolarPanelUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  it('shows what the tilt does to the light and the day', () => {
    expect(readout('tilt')).toBe('35°');
    expect(readout('tilt-incidence')).toBe('5°');
    expect(readout('tilt-irradiance')).toBe('973 W/m²');
    expect(readout('tilt-day')).toMatch(/^2\.7\d kWh$/);
    expect(readout('tilt-flatDay')).toMatch(/^2\.[12]\d kWh$/);
    slide('tilt', 0);
    expect(readout('tilt')).toBe('0°');
    expect(readout('tilt-incidence')).toBe('40°');
    expect(readout('tilt-irradiance')).toBe('764 W/m²');
    expect(readout('tilt-day')).toBe(readout('tilt-flatDay'));
  });

  it('moves the tilt readouts with the time of day', () => {
    store.getState().setPhase(40);
    expect(readout('tilt-irradiance')).toBe('0 W/m²');
    expect(readout('tilt-incidence')).toBe('–');
    store.getState().setPhase(240);
    expect(readout('tilt-irradiance')).toBe('636 W/m²');
  });

  it('jumps to the sun moments from the chips', () => {
    click('moment', 'sunrise');
    expect(store.getState().phase).toBe(SUN_MOMENTS.sunrise);
    expect(pressed('moment', 'sunrise')).toBe('true');
    expect(pressed('moment', 'noon')).toBe('false');
  });

  it('stops updating once disposed', () => {
    dispose();
    store.getState().setTilt(80);
    expect(readout('tilt')).toBe('35°');
  });
});
