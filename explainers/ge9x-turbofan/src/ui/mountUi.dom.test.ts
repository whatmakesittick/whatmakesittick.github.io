import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mountActions } from '@core/ui/actions';
import { createEngineStore } from '../state';
import type { EngineStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { CHAPTER_FIXTURE, TEST_LOCALE, fill, initTestLocale, isFilled } from './testing';
import { mountEngineUi } from '.';

const { units, readouts } = TEST_LOCALE;

function readout(id: string): string | null | undefined {
  return document.querySelector(`[data-readout="${id}"]`)?.textContent;
}

function click(action: string, value: string): void {
  document.querySelector<HTMLElement>(`[data-action="${action}"][data-value="${value}"]`)?.click();
}

function pressed(action: string, value: string): string | null | undefined {
  return document
    .querySelector(`[data-action="${action}"][data-value="${value}"]`)
    ?.getAttribute('aria-pressed');
}

describe('chapter widgets', () => {
  let store: EngineStore;
  let dispose: () => void;

  beforeAll(() => initTestLocale());

  beforeEach(() => {
    document.body.innerHTML = CHAPTER_FIXTURE;
    store = createEngineStore({ playing: false });
    dispose = mountEngineUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  afterEach(() => dispose());

  it('fills every live readout with a finished text', () => {
    const texts = [...document.querySelectorAll('[data-readout]')].map((node) => node.textContent);
    expect(texts).toHaveLength(3);
    texts.forEach((text) => expect(isFilled(text), text ?? '').toBe(true));
  });

  it('follows the thrust lever in the turbines chapter', () => {
    store.getState().setThrust(0);
    expect(readout('fanLive')).toBe(fill(units.percent, { value: '30' }));
    expect(readout('coreLive')).toBe(fill(units.percent, { value: '55' }));
    store.getState().setThrust(1);
    expect(readout('fanLive')).toBe(fill(units.percent, { value: '100' }));
  });

  it('turns the live thrust into reverse thrust when the reverser deploys', () => {
    store.getState().setThrust(1);
    expect(readout('thrustLive')).toBe(fill(units.percent, { value: '100' }));
    click('reverser', 'deployed');
    expect(store.getState().view.reverser).toBe(true);
    expect(pressed('reverser', 'deployed')).toBe('true');
    expect(readout('thrustLive')).toBe(fill(readouts.reverse, { percent: '14' }));
    click('reverser', 'stowed');
    expect(store.getState().view.reverser).toBe(false);
  });

  it('switches the reverser chapter between the reverser and the starter', () => {
    store.getState().applyPreset('reverse');
    expect(pressed('look', 'reverser')).toBe('true');
    click('look', 'starter');
    expect(store.getState()).toMatchObject({ look: 'starter', cutaway: 'cutaway' });
    expect(store.getState().view.reverser).toBe(false);
    expect(pressed('look', 'starter')).toBe('true');
    expect(pressed('look', 'reverser')).toBe('false');
    expect(pressed('reverser', 'stowed')).toBe('true');
    click('look', 'reverser');
    expect(store.getState().view.reverser).toBe(true);
    expect(pressed('look', 'reverser')).toBe('true');
  });

  it('runs the cutaway and stream chips', () => {
    click('cutaway', 'cutaway');
    click('streams', 'cold');
    expect(store.getState()).toMatchObject({ cutaway: 'cutaway', streams: 'cold' });
    expect(pressed('cutaway', 'cutaway')).toBe('true');
    expect(pressed('streams', 'cold')).toBe('true');
    expect(pressed('streams', 'both')).toBe('false');
  });
});
