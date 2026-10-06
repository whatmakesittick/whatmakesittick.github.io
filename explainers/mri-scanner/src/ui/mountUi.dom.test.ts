import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import { mountActions } from '@core/ui/actions';
import chapters from '../../chapters.html?raw';
import en from '../../locales/en.json';
import { AXIS_CHOICE_IDS, FIELD_IDS, LINE_CHOICE_IDS, TISSUE_IDS, WEIGHTING_IDS } from '../ids';
import { MOMENTS } from '../model';
import { createMriScannerStore } from '../state';
import type { MriScannerStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { fill, isFilled } from './testing';
import { mountMriScannerUi } from '.';

const { units, chapters: copy } = en;

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

function tipInput(): HTMLInputElement {
  const found = document.querySelector<HTMLInputElement>('[data-control="tip-angle"]');
  if (!found) throw new Error('No tip-angle control');
  return found;
}

function chipValues(action: string): (string | null)[] {
  return [...document.querySelectorAll(`.chip[data-action="${action}"]`)].map((node) =>
    node.getAttribute('data-value'),
  );
}

describe('chapter widgets', () => {
  let store: MriScannerStore;
  let dispose: () => void;

  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  beforeEach(() => {
    document.body.innerHTML = chapters;
    store = createMriScannerStore({ playing: false, phase: 0 });
    dispose = mountMriScannerUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  afterEach(() => dispose());

  it('offers a chip for every option the chapters switch', () => {
    expect(new Set(chipValues('field'))).toEqual(new Set(FIELD_IDS));
    expect(chipValues('weighting')).toEqual([...WEIGHTING_IDS]);
    expect(chipValues('tissue')).toEqual([...TISSUE_IDS]);
    expect(chipValues('gradientAxis')).toEqual([...AXIS_CHOICE_IDS]);
    expect(chipValues('lines')).toEqual([...LINE_CHOICE_IDS]);
  });

  it('fills every readout with a finished text', () => {
    const texts = [...document.querySelectorAll('[data-readout]')].map((node) => node.textContent);
    expect(texts.length).toBeGreaterThan(0);
    texts.forEach((text) => expect(isFilled(text), text ?? '').toBe(true));
  });

  it('follows the field across the overview, the magnet and the spins', () => {
    expect(readout('fieldNow')).toBe(fill(copy.overview.field, { tesla: '1.5 T' }));
    click('field', 'field30');
    expect(pressed('field', 'field30')).toBe('true');
    expect(readout('fieldNow')).toBe(fill(copy.overview.field, { tesla: '3 T' }));
    expect(readout('slowdown')).toBe(fill(copy.spins.slowdownValue, { factor: '255 million' }));
    expect(readout('fieldShare')).toBe(fill(units.percent, { value: '0.18' }));
  });

  it('turns the tip angle into the across and along shares', () => {
    expect(tipInput().max).toBe('180');
    tipInput().value = '180';
    tipInput().dispatchEvent(new Event('input'));
    expect(store.getState().tipAngle).toBe(180);
    expect(document.querySelector('output[for="tip-angle"]')?.textContent).toBe(
      fill(units.degrees, { value: '180' }),
    );
    expect(readout('along')).toBe(fill(units.percent, { value: '-100' }));
    expect(readout('across')).toBe(fill(units.percent, { value: '0' }));
  });

  it('shows the relaxation times of the chosen tissue and pauses at a moment', () => {
    click('tissue', 'fluid');
    expect(readout('t1')).toBe(fill(units.ms, { value: '4,300' }));
    expect(readout('t2')).toBe(fill(units.ms, { value: '2,000' }));
    click('moment', 'echoPeak');
    expect(store.getState().phase).toBe(MOMENTS.echoPeak);
    expect(pressed('moment', 'echoPeak')).toBe('true');
  });

  it('names the role of the held gradient coil', () => {
    click('gradientAxis', 'z');
    expect(readout('axisRole')).toBe(copy.gradients.roleValue.z);
    click('gradientAxis', 'sequence');
    expect(readout('axisRole')).toBe(copy.gradients.roleValue.sequence);
  });

  it('updates the picture readouts with the weighting and the lines', () => {
    click('weighting', 't1');
    expect(readout('turbo')).toBe(fill(copy.picture.turboValue, { seconds: '8' }));
    expect(readout('brightFat')).toBe(fill(units.percent, { value: '100' }));
    click('lines', '16');
    expect(store.getState().linesFilled).toBe(16);
    expect(pressed('lines', '16')).toBe('true');
  });
});
