import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mountActions } from '@core/ui/actions';
import { MOMENTS } from '../model';
import { createSwimStore } from '../state';
import type { SwimStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { CHAPTER_FIXTURE, TEST_LOCALE, fill, initTestLocale, isFilled } from './testing';
import { mountSwimUi } from '.';

const { units, chapters, controls, timeline } = TEST_LOCALE;

const AFTER_CATCH = 300;

function readout(id: string): string | null | undefined {
  return document.querySelector(`[data-readout="${id}"]`)?.textContent;
}

function click(action: string, value: string): void {
  document.querySelector<HTMLElement>(`[data-action="${action}"][data-value="${value}"]`)?.click();
}

function slide(value: number): void {
  const input = document.querySelector<HTMLInputElement>('#drag-speed');
  if (!input) throw new Error('No range');
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
}

describe('chapter widgets', () => {
  let store: SwimStore;
  let dispose: () => void;

  beforeAll(() => initTestLocale());

  beforeEach(() => {
    document.body.innerHTML = CHAPTER_FIXTURE;
    store = createSwimStore({ playing: false, phase: AFTER_CATCH });
    dispose = mountSwimUi(document, store) as () => void;
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  afterEach(() => dispose());

  it('fills every readout with a finished text', () => {
    const texts = [...document.querySelectorAll('[data-readout]')].map((node) => node.textContent);
    expect(texts).toHaveLength(25);
    texts.forEach((text) => expect(isFilled(text), text ?? '').toBe(true));
  });

  it('shows the model at the catch', () => {
    expect(readout('strokeSpeed')).toMatch(/^\d\.\d\d/);
    expect(readout('strokeRate')).toBe(fill(units.perMinute, { value: '42' }));
    expect(readout('catchElbow')).toBe(fill(units.degrees, { value: '148' }));
    expect(readout('kickPattern')).toBe(controls.kickOptions.six);
    expect(readout('kickBeats')).toBe('6');
    expect(readout('gapEasy')).toBe(
      fill(chapters.drag.gapValue, { seconds: '0.13', percent: '7.6' }),
    );
    expect(readout('gapNow')).toBe(
      fill(chapters.drag.gapValue, { seconds: '0.05', percent: '3.2' }),
    );
  });

  it('reacts to the scrubber', () => {
    const elbow = readout('catchElbow');
    store.getState().setPhase(MOMENTS.recoveryMid);
    expect(readout('catchElbow')).toBe(chapters.catch.noElbow);
    expect(readout('catchElbow')).not.toBe(elbow);
    expect(readout('catchDepth')).toBe(chapters.catch.inAir);
    expect(readout('strokePhase')).toBe(timeline.phase.recovery);
  });

  it('switches pace, kick and breathing from the chips', () => {
    click('pace', 'sprint');
    expect(readout('strokeRate')).toBe(fill(units.perMinute, { value: '60' }));
    expect(readout('gapNow')).toBe(
      fill(chapters.drag.overlapValue, { seconds: '0.04', percent: '3.8' }),
    );
    click('kick', 'two');
    expect(readout('kickBeats')).toBe('2');
    click('breath', 'right');
    store.getState().setPhase(MOMENTS.recoveryMid);
    expect(readout('rollBreath')).toBe(fill(units.degrees, { value: '9' }));
  });

  it('shows text, not a multiplied force, with the head up', () => {
    const before = readout('dragAt');
    slide(2);
    expect(document.querySelector('output')?.textContent).toBe(
      fill(units.metersPerSecond, { value: '2.0' }),
    );
    expect(readout('dragAt')).toBe(fill(units.newtons, { value: '108' }));
    expect(readout('dragAt')).not.toBe(before);
    click('head', 'up');
    expect(readout('dragNow')).toBe(chapters.drag.dragUp);
    expect(readout('dragAt')).toBe(chapters.drag.dragUp);
    expect(readout('powerAt')).toBe(chapters.drag.dragUp);
  });
});
