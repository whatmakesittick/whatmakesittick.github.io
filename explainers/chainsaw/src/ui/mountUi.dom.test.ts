import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mountActions } from '@core/ui/actions';
import { createChainsawStore } from '../state';
import type { ChainsawStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { capitalise } from './format';
import { CHAPTER_FIXTURE, TEST_LOCALE, fill, initTestLocale, isFilled } from './testing';
import { mountChainsawUi } from '.';

const { units, chapters, readouts, timeline } = TEST_LOCALE;

function readout(id: string): string | null | undefined {
  return document.querySelector(`[data-readout="${id}"]`)?.textContent;
}

function click(action: string, value: string): void {
  document.querySelector<HTMLElement>(`[data-action="${action}"][data-value="${value}"]`)?.click();
}

function slide(id: string, value: number): void {
  const input = document.querySelector<HTMLInputElement>(`#${id}`);
  if (!input) throw new Error(`No ${id} control`);
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
}

function output(id: string): string | null | undefined {
  return document.querySelector(`output[for="${id}"]`)?.textContent;
}

function pressed(action: string, value: string): string | null | undefined {
  return document
    .querySelector(`[data-action="${action}"][data-value="${value}"]`)
    ?.getAttribute('aria-pressed');
}

describe('chapter widgets', () => {
  let store: ChainsawStore;
  let dispose: () => void;

  beforeAll(() => initTestLocale());

  beforeEach(() => {
    document.body.innerHTML = CHAPTER_FIXTURE;
    store = createChainsawStore({ playing: false, phase: 0 });
    dispose = mountChainsawUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  afterEach(() => dispose());

  it('fills every readout with a finished text', () => {
    const texts = [...document.querySelectorAll('[data-readout]')].map((node) => node.textContent);
    expect(texts).toHaveLength(17);
    texts.forEach((text) => expect(isFilled(text), text ?? '').toBe(true));
  });

  it('shows the facts sheet numbers at full throttle', () => {
    expect(output('saw-throttle')).toBe(fill(units.percent, { value: '100' }));
    expect(readout('sawRpm')).toBe(fill(units.rpm, { value: '9,900' }));
    expect(readout('sawChain')).toBe(fill(units.speedPair, { ms: '22.0', kmh: '79' }));
    expect(readout('turnTime')).toBe(fill(units.milliseconds, { value: '6.1' }));
    expect(readout('strokes')).toBe(fill(units.count, { value: '165' }));
    expect(readout('cuttersPerSecond')).toBe(fill(units.count, { value: '570' }));
    expect(readout('idleRpm')).toBe(fill(units.rpm, { value: '2,700' }));
    expect(readout('engageRpm')).toBe(fill(units.rpm, { value: '3,700' }));
    expect(readout('perTurn')).toBe(fill(chapters.clutch.perTurnValue, { mm: '133', teeth: '7' }));
    expect(readout('oil')).toBe(chapters.clutch.oilState.pumping);
  });

  it('stops the chain and the oil at idle from either slider', () => {
    slide('clutch-throttle', 0);
    expect(store.getState().throttle).toBe(0);
    expect(output('saw-throttle')).toBe(fill(units.percent, { value: '0' }));
    expect(readout('clutchRpm')).toBe(fill(units.rpm, { value: '2,700' }));
    expect(readout('clutchState')).toBe(readouts.clutchState.open);
    expect(readout('clutchChain')).toBe(fill(units.speedPair, { ms: '0.0', kmh: '0' }));
    expect(readout('oil')).toBe(chapters.clutch.oilState.stopped);
    slide('saw-throttle', 0.14);
    expect(readout('clutchChain')).toBe(fill(units.speedPair, { ms: '8.2', kmh: '30' }));
  });

  it('follows the throttle chips and marks the current one', () => {
    click('throttle', 'half');
    expect(store.getState().throttle).toBe(0.5);
    expect(readout('throttleOpen')).toBe(fill(units.percent, { value: '50' }));
    expect(pressed('throttle', 'half')).toBe('true');
    slide('saw-throttle', 0.37);
    expect(pressed('throttle', 'half')).toBe('false');
  });

  it('follows the crank in the engine and fuel readouts', () => {
    expect(readout('crankcase')).toBe(chapters.fuel.pressure.squeezing);
    store.getState().setPhase(300);
    expect(readout('phaseNow')).toBe(capitalise(timeline.detail.compression, 'en'));
    expect(readout('crankcase')).toBe(chapters.fuel.pressure.drawing);
  });

  it('holds the chain with the brake chip and starts a kickback with the brake off', () => {
    click('brake', 'on');
    expect(readout('brakeState')).toBe(chapters.kickback.brakeState.on);
    expect(readout('clutchState')).toBe(readouts.clutchState.slipping);
    expect(readout('chainSpeed')).toBe(fill(units.speedPair, { ms: '0.0', kmh: '0' }));
    click('kickback', 'strong');
    expect(store.getState().kickback).toBe(true);
    expect(pressed('kickback', 'strong')).toBe('true');
    expect(readout('brakeState')).toBe(chapters.kickback.brakeState.off);
  });
});
