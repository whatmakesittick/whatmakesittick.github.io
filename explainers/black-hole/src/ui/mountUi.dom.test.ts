import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import { mountActions } from '@core/ui/actions';
import { TEXT_REFRESH_INTERVAL_MS } from '@core/ui/throttle';
import chapters from '../../chapters.html?raw';
import en from '../../locales/en.json';
import { CENTRE_TIME, HORIZON_TIME, MOMENTS, tauAtRadius } from '../model';
import { createBlackHoleStore } from '../state';
import type { BlackHoleStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { mountBlackHoleUi } from '.';

function readout(id: string): string | null | undefined {
  return document.querySelector(`[data-readout="${id}"]`)?.textContent;
}

function click(action: string, value: string): void {
  document.querySelector<HTMLElement>(`[data-action="${action}"][data-value="${value}"]`)?.click();
}

function nextRefresh(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, TEXT_REFRESH_INTERVAL_MS + 1));
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

function output(control: string): string | null | undefined {
  return document.querySelector(`output[for="${control}"]`)?.textContent;
}

describe('chapter widgets', () => {
  let store: BlackHoleStore;
  let dispose: () => void;

  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  beforeEach(() => {
    document.body.innerHTML = chapters;
    store = createBlackHoleStore({ playing: false, phase: 0 });
    dispose = mountBlackHoleUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  afterEach(() => dispose());

  it('shows the two clocks in the overview', () => {
    expect(readout('overview-probe')).toBe('0:00');
    expect(readout('overview-ship')).toBe('0:00');
    store.getState().setPhase(tauAtRadius(2));
    expect(readout('overview-probe')).toBe('10:51');
    expect(readout('overview-ship')).toBe('15:41');
    store.getState().setPhase(HORIZON_TIME);
    expect(readout('overview-ship')).toBe(en.clocks.never);
  });

  it('moves the probe with the radius slider and pauses the fall', async () => {
    expect(output('radius')).toBe('5.0 rs');
    expect(readout('radius-ratio')).toBe('1.1');
    expect(readout('radius-flash')).toBe(en.clocks.flash.white);
    store.getState().play();
    slide('radius', 2);
    await nextRefresh();
    expect(store.getState().playing).toBe(false);
    expect(store.getState().phase).toBeCloseTo(tauAtRadius(2));
    expect(output('radius')).toBe('2.0 rs');
    expect(readout('radius-probe')).toBe('10:51');
    expect(readout('radius-ship')).toBe('15:41');
    expect(readout('radius-ratio')).toBe('2.8');
    expect(readout('radius-flash')).toBe(en.clocks.flash.red);
  });

  it('pins the slider at the horizon while the probe is inside', async () => {
    store.getState().setPhase(CENTRE_TIME);
    await nextRefresh();
    expect(output('radius')).toBe('1.0 rs');
    expect(readout('radius-ship')).toBe(en.clocks.never);
    expect(readout('radius-ratio')).toBe('∞');
    expect(readout('radius-flash')).toBe(en.clocks.flash.gone);
  });

  it('seeks the moments of the fall from the chips', () => {
    click('moment', 'lightRing');
    expect(store.getState().phase).toBe(MOMENTS.lightRing);
    expect(pressed('moment', 'lightRing')).toBe('true');
    click('moment', 'horizon');
    expect(pressed('moment', 'lightRing')).toBe('false');
    expect(pressed('moment', 'horizon')).toBe('true');
  });

  it('shows what the ship sees as the probe nears the horizon', () => {
    store.getState().setPhase(tauAtRadius(2));
    expect(readout('frozen-ship')).toBe('15:41');
    expect(readout('frozen-gap')).toBe('28 s');
    expect(readout('frozen-brightness')).toBe('1.4 %');
    expect(readout('frozen-colour')).toBe(en.clocks.flash.red);
    store.getState().setPhase(HORIZON_TIME);
    expect(readout('frozen-ship')).toBe(en.clocks.never);
    expect(readout('frozen-gap')).toBe('∞');
    expect(readout('frozen-brightness')).toBe('0.0 %');
    expect(readout('frozen-colour')).toBe(en.clocks.flash.gone);
  });

  it('counts the probe down to the centre', () => {
    store.getState().setPhase(HORIZON_TIME);
    expect(readout('inside-left')).toBe('0:30');
    expect(readout('inside-speed')).toBe('1.00 c');
    expect(readout('inside-tide')).toBe('0.00011 g');
    store.getState().setPhase(0);
    expect(readout('inside-left')).toBe('12:23');
    expect(readout('inside-speed')).toBe('0.00 c');
    expect(readout('inside-tide')).toBe(en.units.gBelow.replace('{{value}}', '0.0001'));
  });

  it('compares the black hole the reader picks', () => {
    expect(readout('others-mass')).toBe('4.3 million Suns');
    expect(readout('others-horizon')).toBe('12.7 million km');
    expect(readout('others-fall')).toBe('12 minutes');
    expect(readout('others-tide')).toBe('0.00011 g');
    click('comparison', 'm87');
    expect(pressed('comparison', 'm87')).toBe('true');
    expect(readout('others-mass')).toBe('6.5 billion Suns');
    expect(readout('others-fall')).toBe('13 days');
    expect(readout('others-tide')).toBe(en.units.gBelow.replace('{{value}}', '0.0001'));
    click('comparison', 'stellar');
    expect(readout('others-horizon')).toBe('62 km');
    expect(readout('others-fall')).toBe('4 thousandths of a second');
    expect(readout('others-tide')).toBe('4.8 million g');
  });

  it('stops updating once disposed', () => {
    dispose();
    store.getState().setComparison('m87');
    store.getState().setPhase(HORIZON_TIME);
    expect(readout('others-mass')).toBe('4.3 million Suns');
    expect(readout('overview-probe')).toBe('0:00');
  });
});
