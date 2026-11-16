import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mountActions } from '@core/ui/actions';
import { CYCLE_UNITS, MOMENTS, PHASE_RANGES } from '../model';
import { createClockStore } from '../state';
import type { ClockStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { CHAPTER_FIXTURE, TEST_LOCALE, fill, initTestLocale, isFilled } from './testing';
import { mountClockUi } from '.';

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
  let store: ClockStore;
  let dispose: () => void;

  beforeAll(() => initTestLocale());

  beforeEach(() => {
    document.body.innerHTML = CHAPTER_FIXTURE;
    store = createClockStore({ playing: false, phase: 0 });
    dispose = mountClockUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  afterEach(() => dispose());

  it('fills every readout with a finished text', () => {
    const texts = [...document.querySelectorAll('[data-readout]')].map((node) => node.textContent);
    expect(texts).toHaveLength(12);
    texts.forEach((text) => expect(isFilled(text), text ?? '').toBe(true));
  });

  it('shows the facts sheet numbers at the start of recipe A', () => {
    expect(readout('pourClock')).toBe(fill(timeline.value, { seconds: '0.0' }));
    expect(readout('bisulfiteLeft')).toBe(fill(units.millimolar, { value: '12.50' }));
    expect(readout('iodideMade')).toBe(fill(units.millimolar, { value: '0.00' }));
    expect(readout('acidMade')).toBe(fill(units.millimolar, { value: '0.00' }));
    expect(readout('iodineLifetime')).toBe(fill(units.nanoseconds, { value: '44' }));
    expect(readout('switchAt')).toBe(fill(timeline.value, { seconds: '10.0' }));
    expect(readout('iodineNow')).toBe(readouts.iodineState.eaten);
    expect(readout('pace')).toBe(readouts.pace.real);
    expect(readout('helixFill')).toBe(fill(units.percent, { value: '0' }));
    expect(readout('tuningRatio')).toBe(fill(chapters.tuning.ratioValue, { ratio: '0.50' }));
    expect(output('tuning-iodate')).toBe(fill(units.millimolar, { value: '25.0' }));
    expect(output('tuning-temperature')).toBe(fill(units.celsius, { value: '20' }));
  });

  it('follows the scrubber through the switch', () => {
    store.getState().setPhase(MOMENTS.switch);
    expect(readout('pourClock')).toBe(fill(timeline.value, { seconds: '10.000' }));
    expect(readout('bisulfiteNow')).toBe(fill(units.millimolar, { value: '0.00' }));
    expect(readout('iodideMade')).toBe(fill(units.millimolar, { value: '4.17' }));
    expect(readout('iodineLifetime')).toBe(chapters.invisibleIodine.survives);
    expect(readout('pace')).toBe(fill(readouts.pace.slower, { factor: '75' }));
    store.getState().setPhase(PHASE_RANGES.blue.start);
    expect(readout('helixFill')).toBe(fill(units.percent, { value: '100' }));
    expect(readout('iodineNow')).toBe(fill(units.millimolar, { value: '2.45' }));
    store.getState().setPhase(CYCLE_UNITS);
    expect(readout('iodideMade')).toBe(fill(units.millimolar, { value: '4.17' }));
    expect(readout('acidMade')).toBe(fill(units.millimolar, { value: '12.50' }));
  });

  it('moves the switch time with both sliders and keeps the stage of the reaction', () => {
    store.getState().setPhase(500);
    slide('tuning-iodate', 12.5);
    expect(store.getState()).toMatchObject({ iodateMm: 12.5, phase: 500 });
    expect(output('tuning-iodate')).toBe(fill(units.millimolar, { value: '12.5' }));
    expect(readout('tuningSwitch')).toBe(fill(timeline.value, { seconds: '20.0' }));
    expect(readout('switchAt')).toBe(fill(timeline.value, { seconds: '20.0' }));
    expect(readout('tuningRatio')).toBe(fill(chapters.tuning.ratioValue, { ratio: '1.00' }));
    slide('tuning-temperature', 0);
    expect(output('tuning-temperature')).toBe(fill(units.celsius, { value: '5' }));
    expect(readout('tuningSwitch')).toBe(fill(timeline.value, { seconds: '27.1' }));
  });

  it('flips the scale from the chips and mixes again', () => {
    click('scale', 'molecules');
    expect(store.getState().scale).toBe('molecules');
    expect(pressed('scale', 'molecules')).toBe('true');
    expect(pressed('scale', 'beaker')).toBe('false');
    store.getState().setPhase(700);
    click('mix', 'again');
    expect(store.getState()).toMatchObject({ phase: 0, playing: true });
  });
});
