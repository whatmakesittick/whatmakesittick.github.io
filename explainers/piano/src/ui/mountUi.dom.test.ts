import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mountActions } from '@core/ui/actions';
import { COMPARE_IDS, MOMENT_IDS } from '../ids';
import { MOMENTS } from '../model';
import { createPianoStore } from '../state';
import type { PianoStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { CHAPTER_MARKUP, TEST_LOCALE, fill, initTestLocale, isFilled } from './testing';
import { mountPianoUi } from '.';

const { units, chapters } = TEST_LOCALE;
const { key, lever, letGo, dampers, room, compare } = chapters;
const READOUT_COUNT = 24;
const RISING_PHASE = 200;
const HELD_PHASE = 500;
const FALLING_PHASE = 950;
const SETTLED_PHASE = 990;

interface TouchTexts {
  touchTime: string;
  keySpeed: string;
  hammerSpeed: string;
  drop: string;
  flight: string;
  check: string;
  lead: string;
}

const TOUCH_TEXTS: Record<'soft' | 'medium' | 'hard', TouchTexts> = {
  soft: {
    touchTime: '160',
    keySpeed: '0.18',
    hammerSpeed: '1.0',
    drop: '5',
    flight: '1.5',
    check: '13',
    lead: '74',
  },
  medium: {
    touchTime: '67',
    keySpeed: '0.30',
    hammerSpeed: '1.7',
    drop: '14',
    flight: '0.9',
    check: '15',
    lead: '40',
  },
  hard: {
    touchTime: '36',
    keySpeed: '0.91',
    hammerSpeed: '5.0',
    drop: '127',
    flight: '0.3',
    check: '16',
    lead: '15',
  },
};

function readout(id: string): string | null | undefined {
  return document.querySelector(`[data-readout="${id}"]`)?.textContent;
}

function click(action: string, value: string): void {
  document.querySelector<HTMLElement>(`[data-action="${action}"][data-value="${value}"]`)?.click();
}

function pressed(action: string, value: string): (string | null)[] {
  return [...document.querySelectorAll(`[data-action="${action}"][data-value="${value}"]`)].map(
    (chip) => chip.getAttribute('aria-pressed'),
  );
}

function readoutTexts(): (string | null)[] {
  return [...document.querySelectorAll('[data-readout]')].map((node) => node.textContent);
}

function expectTouch(values: TouchTexts): void {
  expect(readout('touchTime')).toBe(fill(key.touchTimeValue, { ms: values.touchTime }));
  expect(readout('keySpeed')).toBe(fill(units.metresPerSecond, { value: values.keySpeed }));
  expect(readout('hammerSpeed')).toBe(fill(units.metresPerSecond, { value: values.hammerSpeed }));
  expect(readout('drop')).toBe(fill(lever.dropValue, { cm: values.drop }));
  expect(readout('flight')).toBe(fill(letGo.flightValue, { ms: values.flight }));
  expect(readout('check')).toBe(fill(letGo.checkValue, { mm: values.check }));
  expect(readout('lead')).toBe(fill(dampers.leadValue, { ms: values.lead }));
}

describe('chapter widgets', () => {
  let store: PianoStore;
  let dispose: () => void;

  beforeAll(() => initTestLocale());

  beforeEach(() => {
    document.body.innerHTML = CHAPTER_MARKUP;
    store = createPianoStore({ playing: false, phase: 0 });
    dispose = mountPianoUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  afterEach(() => dispose());

  it('fills every readout with a finished text', () => {
    const texts = readoutTexts();
    expect(texts).toHaveLength(READOUT_COUNT);
    texts.forEach((text) => expect(isFilled(text), text ?? '').toBe(true));
  });

  it('shows the fixed numbers of the key, the lever, the let-off, the dampers and the frame', () => {
    expect(readout('dip')).toBe(fill(units.aboutMm, { value: '10' }));
    expect(readout('blow')).toBe(fill(units.mmRange, { min: '45', max: '47' }));
    expect(readout('parts')).toBe(fill(key.partsValue, { count: '12,000' }));
    expect(readout('ratio')).toBe(fill(lever.ratioValue, { min: '5', max: '6' }));
    expect(readout('letOff')).toBe(fill(letGo.letOffValue, { min: '1', max: '3', model: '1.5' }));
    expect(readout('repeat')).toBe(fill(letGo.repeatValue, { grand: '15', upright: '7' }));
    expect(readout('undamped')).toBe(fill(dampers.undampedValue, { min: '18', max: '21' }));
    expect(readout('tension')).toBe(fill(room.tensionValue, { tonnes: '20' }));
  });

  it('follows the touch chips in every chapter that reads the stroke', () => {
    expect(pressed('touch', 'medium')).toEqual(['true']);
    expectTouch(TOUCH_TEXTS.medium);
    click('touch', 'soft');
    expect(store.getState().touch).toBe('soft');
    expect(pressed('touch', 'soft')).toEqual(['true']);
    expect(pressed('touch', 'medium')).toEqual(['false']);
    expectTouch(TOUCH_TEXTS.soft);
    click('touch', 'hard');
    expectTouch(TOUCH_TEXTS.hard);
  });

  it('follows the pedal chips in the strings struck, the damper and the fade', () => {
    expect(readout('struck')).toBe(fill(dampers.struckValue, { struck: '3', total: '3' }));
    expect(readout('decay')).toBe(fill(room.decayValue, { seconds: '9.5' }));
    click('pedal', 'unaCorda');
    expect(pressed('pedal', 'unaCorda')).toEqual(['true']);
    expect(readout('struck')).toBe(fill(dampers.struckValue, { struck: '2', total: '3' }));
    click('pedal', 'sustain');
    expect(readout('struck')).toBe(fill(dampers.struckValue, { struck: '3', total: '3' }));
    expect(readout('damper')).toBe(dampers.damperValue.pedal);
    expect(readout('decay')).toBe(fill(room.decayValue, { seconds: '15.3' }));
  });

  it('follows the register chips in the note, its strings, its stretch and its fade', () => {
    expect(pressed('register', 'middle')).toEqual(['true', 'true']);
    expect(readout('note')).toBe(fill(room.noteValue.middle, { hz: '261.6' }));
    expect(readout('strings')).toBe(fill(room.stringsValue.middle, { count: '3' }));
    expect(readout('stretch')).toBe(fill(room.stretchValue, { n: '8', cents: '18' }));
    click('register', 'bass');
    expect(pressed('register', 'bass')).toEqual(['true', 'true']);
    expect(readout('note')).toBe(fill(room.noteValue.bass, { hz: '65.4' }));
    expect(readout('strings')).toBe(fill(room.stringsValue.bass, { count: '2' }));
    expect(readout('stretch')).toBe(fill(room.stretchValue, { n: '8', cents: '2' }));
    expect(readout('decay')).toBe(fill(room.decayValue, { seconds: '20.3' }));
    click('pedal', 'unaCorda');
    expect(readout('struck')).toBe(fill(dampers.struckValue, { struck: '1', total: '2' }));
    click('pedal', 'sustain');
    expect(readout('decay')).toBe(fill(room.decayValue, { seconds: '18.1' }));
    click('register', 'treble');
    expect(readout('note')).toBe(fill(room.noteValue.treble, { hz: '2,093' }));
    expect(readout('strings')).toBe(fill(room.stringsValue.treble, { count: '3' }));
    expect(readout('stretch')).toBe(fill(room.stretchModel, { n: '4', cents: '84' }));
    expect(readout('decay')).toBe(fill(room.decayModel, { seconds: '12.0' }));
    expect(readout('damper')).toBe(dampers.damperValue.none);
  });

  it('lifts and drops the live damper as the phase changes', () => {
    expect(readout('damper')).toBe(dampers.damperValue.down);
    store.getState().setPhase(RISING_PHASE);
    expect(readout('damper')).toBe(dampers.damperValue.rising);
    store.getState().setPhase(HELD_PHASE);
    expect(readout('damper')).toBe(dampers.damperValue.up);
    store.getState().setPhase(FALLING_PHASE);
    expect(readout('damper')).toBe(dampers.damperValue.falling);
    store.getState().setPhase(SETTLED_PHASE);
    expect(readout('damper')).toBe(dampers.damperValue.down);
  });

  it('reads out each instrument in the line-up', () => {
    COMPARE_IDS.forEach((instrument) => {
      click('compare', instrument);
      expect(pressed('compare', instrument)).toEqual(['true']);
      expect(readout('cmpMove')).toBe(compare.moveValue[instrument]);
      expect(readout('cmpReturn')).toBe(compare.returnValue[instrument]);
      expect(readout('cmpTouch')).toBe(compare.touchValue[instrument]);
    });
  });

  it('turns the sound on and off from its chips', () => {
    expect(pressed('sound', 'off')).toEqual(['true']);
    click('sound', 'on');
    expect(store.getState().view.sound).toBe(true);
    expect(pressed('sound', 'on')).toEqual(['true']);
    expect(pressed('sound', 'off')).toEqual(['false']);
    click('sound', 'off');
    expect(store.getState().view.sound).toBe(false);
  });

  it('seeks to each moment chip, pauses there and marks only that moment', () => {
    const values = [...document.querySelectorAll<HTMLElement>('[data-action="moment"]')].map(
      (chip) => chip.dataset.value,
    );
    expect(new Set(values)).toEqual(new Set(MOMENT_IDS));
    store.getState().play();
    MOMENT_IDS.forEach((moment) => {
      click('moment', moment);
      expect(store.getState()).toMatchObject({ phase: MOMENTS[moment], playing: false });
      MOMENT_IDS.forEach((other) =>
        pressed('moment', other).forEach((state) =>
          expect(state, other).toBe(String(other === moment)),
        ),
      );
    });
    store.getState().play();
    MOMENT_IDS.forEach((moment) =>
      pressed('moment', moment).forEach((state) => expect(state).toBe('false')),
    );
  });
});
