import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mountActions } from '@core/ui/actions';
import { MOMENTS, unitsAt } from '../model';
import { createFlavorStore } from '../state';
import type { FlavorStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { CHAPTER_FIXTURE, TEST_LOCALE, fill, initTestLocale, isFilled } from './testing';
import { mountFlavorUi } from '.';

const { units, chapters, percept, smells, odorants, notes, controls } = TEST_LOCALE;

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

const percent = (value: string) => fill(units.percent, { value });
const celsius = (value: string) => fill(units.celsius, { value });

describe('chapter widgets', () => {
  let store: FlavorStore;
  let dispose: () => void;

  beforeAll(() => initTestLocale());

  beforeEach(() => {
    document.body.innerHTML = CHAPTER_FIXTURE;
    store = createFlavorStore({ playing: false, phase: MOMENTS.firing });
    dispose = mountFlavorUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  afterEach(() => dispose());

  it('fills every readout with a finished text', () => {
    const texts = [...document.querySelectorAll('[data-readout]')].map((node) => node.textContent);
    expect(texts).toHaveLength(17);
    texts.forEach((text) => expect(isFilled(text), text ?? '').toBe(true));
  });

  it('shows the model at ten seconds into the bite', () => {
    expect(readout('tongueTemp')).toBe(celsius('26'));
    expect(readout('tongueSweet')).toBe(percent('100'));
    expect(readout('tongueSour')).toBe(percent('35'));
    expect(readout('routesOrtho')).toBe(percent('0'));
    expect(readout('routesNotice')).toBe(fill(percept.flavor, { smell: smells.cherry }));
    expect(readout('receptorsFiring')).toBe(
      fill(chapters.receptors.firingValue, { count: '9', total: '40' }),
    );
    expect(readout('cherryMain')).toBe(
      fill(chapters.cherry.mainValue, { odorant: odorants.benzaldehyde, note: notes.almond }),
    );
    expect(readout('cherryShare')).toBe(percent('46'));
    expect(readout('deskSmell')).toBe(smells.marzipan);
    expect(readout('deskMatch')).toBe(percent('84'));
    expect(readout('deskDrops')).toBe('6');
    expect(readout('iceMelted')).toBe(percent('100'));
    expect(output('ice-serving')).toBe(celsius('−12'));
    expect(output('ice-fat')).toBe(percent('10'));
    expect(output('desk-benzaldehyde')).toBe('6');
  });

  it('shows the cold bite with a real minus sign', () => {
    store.getState().setPhase(unitsAt(-1));
    expect(readout('tongueTemp')).toBe(celsius('−12'));
    expect(readout('routesOrtho')).not.toBe(percent('0'));
    expect(readout('routesNotice')).toBe(fill(percept.smell, { smell: smells.cherry }));
  });

  it('pinches the nose from the chips', () => {
    click('nose', 'pinched');
    expect(store.getState().view.pinched).toBe(true);
    expect(pressed('nose', 'pinched')).toBe('true');
    expect(readout('routesRetro')).toBe(percent('0'));
    expect(readout('routesNotice')).toBe(fill(percept.pinched, { smell: smells.cherry }));
  });

  it('sniffs one bottle and fires only its cells', () => {
    click('sniff', 'hexenal');
    expect(readout('receptorsSniffed')).toBe(controls.sniffOptions.hexenal);
    expect(readout('receptorsFiring')).toBe(
      fill(chapters.receptors.firingValue, { count: '5', total: '40' }),
    );
  });

  it('switches the food and loads desk recipes', () => {
    click('food', 'marzipan');
    expect(readout('cherryShare')).toBe(percent('100'));
    click('recipe', 'fruit');
    expect(pressed('recipe', 'fruit')).toBe('true');
    expect(readout('deskSmell')).toBe(smells.cherry);
    expect(readout('deskMatch')).toBe(percent('100'));
    slide('desk-ionone', 9);
    expect(store.getState().desk.ionone).toBe(9);
    expect(pressed('recipe', 'fruit')).toBe('false');
  });

  it('raises the peak with less fat', () => {
    const before = readout('icePeak');
    slide('ice-fat', 2);
    expect(output('ice-fat')).toBe(percent('2'));
    expect(readout('icePeak')).toBe(percent('100'));
    expect(readout('icePeak')).not.toBe(before);
  });
});
