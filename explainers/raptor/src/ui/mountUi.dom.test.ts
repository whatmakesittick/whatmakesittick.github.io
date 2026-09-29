import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import { mountActions } from '@core/ui/actions';
import chapters from '../../chapters.html?raw';
import en from '../../locales/en.json';
import { MOMENTS } from '../model/phases';
import { createRaptorStore } from '../state';
import type { RaptorStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { mountRaptorUi } from '.';

function readout(id: string): string | null | undefined {
  return document.querySelector(`[data-readout="${id}"]`)?.textContent;
}

function click(action: string, value: string): void {
  document.querySelector<HTMLElement>(`[data-action="${action}"][data-value="${value}"]`)?.click();
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
  let store: RaptorStore;
  let dispose: () => void;

  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  beforeEach(() => {
    document.body.innerHTML = chapters;
    store = createRaptorStore({ playing: false, phase: 3 });
    dispose = mountRaptorUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  afterEach(() => dispose());

  it('shows what one engine burns and pushes at liftoff', () => {
    expect(readout('overview-burn')).toBe('758 kg');
    expect(readout('overview-lift')).toBe('164 times');
    expect(readout('overview-booster')).toBe('8,250 t');
    store.getState().setPhase(0);
    expect(readout('overview-burn')).toBe(en.units.off);
    expect(readout('overview-booster')).toBe(en.units.off);
  });

  it('describes the propellant the reader picks', () => {
    expect(readout('propellant-boils')).toBe('111 K (−162 °C)');
    expect(readout('propellant-share')).toBe('22 %');
    expect(readout('propellant-flow')).toBe('165 kg/s');
    expect(readout('propellant-route')).toBe(en.propellants.route.methane);
    click('propellant', 'oxygen');
    expect(pressed('propellant', 'oxygen')).toBe('true');
    expect(readout('propellant-boils')).toBe('90 K (−183 °C)');
    expect(readout('propellant-share')).toBe('78 %');
    expect(readout('propellant-flow')).toBe('593 kg/s');
    expect(readout('propellant-route')).toBe(en.propellants.route.oxygen);
  });

  it('compares the engine the reader picks', () => {
    expect(readout('engine-cycle')).toBe(en.engines.cycle.fullFlow);
    expect(readout('engine-pressure')).toBe('about 330 bar');
    expect(readout('engine-thrust')).toBe('250 t');
    expect(readout('engine-dumps')).toBe(en.engines.dumps.no);
    click('engine', 'merlin');
    expect(pressed('engine', 'merlin')).toBe('true');
    expect(readout('engine-cycle')).toBe(en.engines.cycle.gasGenerator);
    expect(readout('engine-propellants')).toBe(en.engines.propellants.oxygenKerosene);
    expect(readout('engine-pressure')).toBe('about 97 bar');
    expect(readout('engine-dumps')).toBe(en.engines.dumps.yes);
    click('engine', 'rd180');
    expect(readout('engine-thrust')).toBe('about 390 t');
    click('engine', 'rs25');
    expect(readout('engine-pressure')).toBe('206 bar');
    expect(readout('engine-thrust')).toBe('190 t');
  });

  it('reads the chamber off the throttle', () => {
    expect(readout('chamber-oxygen')).toBe('593 kg/s');
    expect(readout('chamber-methane')).toBe('165 kg/s');
    expect(readout('chamber-pressure')).toBe('about 330 bar');
    expect(readout('chamber-temperature')).toBe('about 3,500 K');
    expect(readout('chamber-speed')).toBe('3.2 km/s');
    store.getState().setPhase(0);
    expect(readout('chamber-temperature')).toBe(en.units.off);
    expect(readout('chamber-oxygen')).toBe(en.units.off);
  });

  it('holds back the exhaust speed and the impulse while the thrust builds', () => {
    store.getState().setPhase(1.5);
    expect(readout('chamber-oxygen')).toMatch(/^\d+ kg\/s$/);
    expect(readout('chamber-speed')).toBe(en.units.off);
    expect(readout('height-efficiency')).toBe(en.units.off);
    expect(readout('height-thrust')).toMatch(/^\d+ t$/);
  });

  it('moves the flight with the height slider and thins the air', () => {
    expect(document.querySelector('output[for="height"]')?.textContent).toBe('0.0 km');
    expect(readout('height-air')).toBe('1.01 bar');
    expect(readout('height-exit')).toBe('0.90 bar');
    expect(readout('height-plume')).toBe(en.plume.squeezed);
    expect(readout('height-thrust')).toBe('250 t');
    expect(readout('height-efficiency')).toBe('330 s');
    slide('height', 30);
    expect(store.getState().playing).toBe(false);
    expect(document.querySelector('output[for="height"]')?.textContent).toBe('30.0 km');
    expect(readout('height-plume')).toBe(en.plume.spreading);
    expect(readout('height-thrust')).toBe('264 t');
    expect(readout('height-efficiency')).toBe('348 s');
  });

  it('seeks the launch moments from the chips', () => {
    expect(readout('ascent-speed')).toBe('0 km/h');
    expect(readout('ascent-booster')).toBe('8,250 t');
    click('moment', 'maxQ');
    expect(store.getState().phase).toBe(MOMENTS.maxQ);
    expect(pressed('moment', 'maxQ')).toBe('true');
    expect(readout('ascent-speed')).toMatch(/^1,\d{3} km\/h$/);
    click('moment', 'cutoff');
    expect(pressed('moment', 'maxQ')).toBe('false');
    expect(readout('ascent-steer')).toMatch(/^\d\.\d°$/);
  });

  it('stops updating once disposed', () => {
    dispose();
    store.getState().setPropellant('oxygen');
    store.getState().setPhase(0);
    expect(readout('propellant-share')).toBe('22 %');
    expect(readout('overview-burn')).toBe('758 kg');
  });
});
