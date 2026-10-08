import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mountActions } from '@core/ui/actions';
import { MAX_RPM, RATED_WIND_MS, WIND_PRESETS } from '../model';
import { createWindFarmStore } from '../state';
import type { WindFarmStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { CHAPTER_FIXTURE, TEST_LOCALE, fill, initTestLocale, isFilled } from './testing';
import { mountWindFarmUi } from '.';

const { units, chapters, readouts } = TEST_LOCALE;
const NOON = 720;

function readout(id: string): string | null | undefined {
  return document.querySelector(`[data-readout="${id}"]`)?.textContent;
}

function click(action: string, value: string): void {
  document.querySelector<HTMLElement>(`[data-action="${action}"][data-value="${value}"]`)?.click();
}

function windInput(id: string): HTMLInputElement {
  const found = document.querySelector<HTMLInputElement>(`#${id}`);
  if (!found) throw new Error(`No ${id} control`);
  return found;
}

function slide(id: string, value: number): void {
  const input = windInput(id);
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
}

function output(id: string): string | null | undefined {
  return document.querySelector(`output[for="${id}"]`)?.textContent;
}

describe('chapter widgets', () => {
  let store: WindFarmStore;
  let dispose: () => void;

  beforeAll(() => initTestLocale());

  beforeEach(() => {
    document.body.innerHTML = CHAPTER_FIXTURE;
    store = createWindFarmStore({ playing: false, phase: NOON });
    dispose = mountWindFarmUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  afterEach(() => dispose());

  it('fills every readout with a finished text', () => {
    const texts = [...document.querySelectorAll('[data-readout]')].map((node) => node.textContent);
    expect(texts.length).toBeGreaterThan(0);
    texts.forEach((text) => expect(isFilled(text), text ?? '').toBe(true));
  });

  it('pins the wind from either slider and shows it in both', () => {
    slide('tower-wind', RATED_WIND_MS);
    expect(store.getState().windOverride).toBe(RATED_WIND_MS);
    expect(output('tower-wind')).toBe(fill(units.metresPerSecond, { value: '12.0' }));
    expect(output('curve-wind')).toBe(fill(units.metresPerSecond, { value: '12.0' }));
    expect(windInput('curve-wind').value).toBe(String(RATED_WIND_MS));
    expect(readout('rotorRpm')).toBe(fill(units.rpm, { value: '10.4' }));
    expect(readout('generatorRpm')).toBe(fill(units.rpm, { value: '1,485' }));
    expect(readout('curvePower')).toBe(fill(units.mw, { value: '4.20' }));
    expect(readout('operatingState')).toBe(readouts.state.full);
  });

  it('pins the wind from the power curve slider too', () => {
    slide('curve-wind', WIND_PRESETS.cutIn);
    expect(store.getState().windOverride).toBe(WIND_PRESETS.cutIn);
    expect(output('curve-wind')).toBe(fill(units.metresPerSecond, { value: '3.0' }));
    expect(output('tower-wind')).toBe(output('curve-wind'));
    expect(readout('operatingState')).toBe(readouts.state.partial);
  });

  it('parks the rotor on the cut-out chip and hands the wind back to the day', () => {
    click('windAt', 'cutOut');
    expect(store.getState().windOverride).toBe(WIND_PRESETS.cutOut);
    expect(readout('operatingState')).toBe(readouts.state.parked);
    expect(readout('turnTime')).toBe(chapters.tower.stopped);
    expect(readout('curvePower')).toBe(fill(units.mw, { value: '0.00' }));
    click('windAt', 'day');
    expect(store.getState().windOverride).toBeNull();
    expect(output('tower-wind')).not.toBe(fill(units.metresPerSecond, { value: '25.0' }));
  });

  it('follows the spacing, the site and the nacelle chips', () => {
    click('spacing', '5');
    expect(readout('wakeSpacing')).toBe(
      fill(chapters.farm.spacingValue, { metres: '750', diameters: '5' }),
    );
    expect(readout('rowSpacing')).toBe(readout('wakeSpacing'));
    const typicalCapacity = readout('capacityFactor');
    click('siteWind', 'windy');
    expect(store.getState().siteWind).toBe('windy');
    expect(readout('capacityFactor')).not.toBe(typicalCapacity);
    click('nacelle', 'open');
    expect(store.getState().view.cutaway).toBe(true);
  });

  it('shows the turning speed at rated wind across the tower and the nacelle', () => {
    click('windAt', 'rated');
    expect(readout('shaftRpm')).toBe(readout('rotorRpm'));
    expect(readout('shaftRpm')).toBe(fill(units.rpm, { value: String(MAX_RPM) }));
  });
});
