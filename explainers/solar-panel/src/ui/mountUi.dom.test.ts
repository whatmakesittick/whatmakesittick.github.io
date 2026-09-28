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

  it('pulls the layers apart from the slider', () => {
    expect(readout('explode')).toBe('0%');
    slide('explode', 0.6);
    expect(store.getState().explode).toBe(0.6);
    expect(readout('explode')).toBe('60%');
  });

  it('describes each layer of the panel', () => {
    expect(readout('layer-thickness')).toBe('3.2 mm');
    expect(readout('layer-material')).toBe(en.layers.material.glass);
    expect(readout('layer-job')).toBe(en.layers.job.glass);
    click('layer', 'cell');
    expect(readout('layer-thickness')).toBe('0.14 mm');
    expect(readout('layer-material')).toBe(en.layers.material.cell);
    expect(pressed('layer', 'cell')).toBe('true');
    click('layer', 'frame');
    expect(readout('layer-thickness')).toBe('30 mm');
    click('layer', 'encapsulant');
    expect(readout('layer-thickness')).toBe('–');
    expect(readout('layer-job')).toBe(en.layers.job.encapsulant);
  });

  it('follows one colour of light into the silicon', () => {
    expect(readout('wavelength')).toBe('600 nm');
    expect(readout('wavelength-energy')).toBe('2.07 eV');
    expect(readout('wavelength-band')).toBe('orange');
    expect(readout('wavelength-depth')).toBe('2.4 µm');
    expect(readout('wavelength-heat')).toBe('0.95 eV');
    slide('wavelength', 400);
    expect(readout('wavelength-energy')).toBe('3.10 eV');
    expect(readout('wavelength-band')).toBe('violet');
    expect(readout('wavelength-depth')).toBe('0.11 µm');
    slide('wavelength', 1000);
    expect(readout('wavelength-energy')).toBe('1.24 eV');
    expect(readout('wavelength-depth')).toBe('156 µm');
    expect(readout('wavelength-band')).toBe('near infrared');
    slide('wavelength', 1200);
    expect(readout('wavelength-depth')).toBe(en.units.passes);
    expect(readout('wavelength-heat')).toBe('–');
    expect(readout('wavelength-band')).toBe('infrared');
  });

  it('counts the electrons set free with the light on the panel', () => {
    expect(readout('junction-pairs')).toBe('4.3 × 10¹⁹');
    expect(readout('junction-tooWeak')).toBe('19%');
    expect(readout('junction-heat')).toBe('32%');
    store.getState().setPhase(30);
    expect(readout('junction-pairs')).toBe('0');
  });

  it('shows the shadow creeping up the panel and what the diodes do', () => {
    expect(readout('shade')).toBe('0%');
    expect(readout('shade-cells')).toBe('0 of 108');
    expect(readout('shade-diodes')).toBe('0 of 3');
    expect(readout('shade-power')).toBe('375 W');
    expect(readout('shade-loss')).toBe('0%');
    slide('shade', 0.5);
    expect(readout('shade')).toBe('50%');
    expect(readout('shade-cells')).toBe('54 of 108');
    expect(readout('shade-loss')).toMatch(/^5\d%$/);
    click('layout', 'fullCell');
    expect(pressed('layout', 'fullCell')).toBe('true');
    expect(readout('shade-cells')).toBe('30 of 60');
    expect(readout('shade-power')).toMatch(/^\d W$/);
    expect(readout('shade-loss')).toBe('100%');
  });

  it('keeps the diodes off while the shadow covers every third of the panel alike', () => {
    click('layout', 'fullCell');
    slide('shade', 0.05);
    expect(readout('shade-cells')).toBe('6 of 60');
    expect(readout('shade-diodes')).toBe('0 of 3');
  });

  it('stops updating once disposed', () => {
    dispose();
    store.getState().setTilt(80);
    store.getState().setLayer('backsheet');
    expect(readout('tilt')).toBe('35°');
    expect(readout('layer-material')).toBe(en.layers.material.glass);
  });
});
