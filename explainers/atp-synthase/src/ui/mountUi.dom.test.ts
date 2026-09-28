import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import { mountActions } from '@core/ui/actions';
import chapters from '../../chapters.html?raw';
import en from '../../locales/en.json';
import { createAtpSynthaseStore } from '../state';
import type { AtpSynthaseStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { mountAtpSynthaseUi } from '.';

const { sites } = en;

function readout(id: string): string | null | undefined {
  return document.querySelector(`[data-readout="${id}"]`)?.textContent;
}

function seatState(seat: number): string | undefined {
  return document.querySelector<HTMLElement>(`[data-seat="${seat}"]`)?.dataset.state;
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

function aerobicBar(): string | undefined {
  return document
    .querySelector<HTMLElement>('[data-view="energy-split"]')
    ?.style.getPropertyValue('--aerobic-share');
}

describe('chapter widgets', () => {
  let store: AtpSynthaseStore;
  let dispose: () => void;

  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  beforeEach(() => {
    document.body.innerHTML = chapters;
    store = createAtpSynthaseStore({ playing: false });
    dispose = mountAtpSynthaseUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  it('shows the ATP the oxygen pays for as the slider moves', () => {
    expect(readout('oxygen')).toBe('0.25 L a minute');
    expect(readout('oxygen-perMinute')).toBe('0.03 kg');
    expect(readout('oxygen-perHour')).toBe('1.7 kg');
    expect(readout('oxygen-vsRest')).toBe('×1.0');
    slide('oxygen', 3.15);
    expect(readout('oxygen')).toBe('3.15 L a minute');
    expect(readout('oxygen-perMinute')).toBe('0.36 kg');
    expect(readout('oxygen-vsRest')).toBe('×12.9');
    slide('oxygen', 7.4);
    expect(readout('oxygen-perMinute')).toBe('0.84 kg');
    expect(readout('oxygen-perHour')).toBe('50.3 kg');
    expect(readout('oxygen-vsRest')).toBe('×30.2');
  });

  it('compares the rotor rings', () => {
    expect([readout('ring-blades'), readout('ring-perAtp'), readout('ring-per100')]).toEqual([
      '8',
      '2.7',
      '37.5',
    ]);
    click('ring', 'yeast');
    expect([readout('ring-blades'), readout('ring-perAtp'), readout('ring-per100')]).toEqual([
      '10',
      '3.3',
      '30',
    ]);
    click('ring', 'chloroplast');
    expect([readout('ring-blades'), readout('ring-perAtp'), readout('ring-per100')]).toEqual([
      '14',
      '4.7',
      '21.4',
    ]);
    expect(document.querySelector('[data-value="chloroplast"]')?.getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('moves every seat one state on with each 120° step', () => {
    expect([seatState(0), seatState(1), seatState(2)]).toEqual(['open', 'tight', 'loose']);
    expect(readout('seat-0')).toBe(sites.doing.open);
    expect(readout('seat-1')).toBe(sites.doing.tight);
    expect(readout('seat-2')).toBe(sites.doing.loose);
    store.getState().setPhase(130);
    expect([seatState(0), seatState(1), seatState(2)]).toEqual(['loose', 'open', 'tight']);
    expect(readout('seat-0')).toBe(sites.doing.loose);
    store.getState().setPhase(250);
    expect([seatState(0), seatState(1), seatState(2)]).toEqual(['tight', 'loose', 'open']);
    expect(readout('seat-2')).toBe(sites.doing.open);
  });

  it('splits the energy of each race between oxygen and stores', () => {
    expect(readout('event-aerobic')).toBe('10 to 20%');
    expect(readout('event-anaerobic')).toBe('80 to 90%');
    expect(aerobicBar()).toBe('15%');
    click('event', 'm800');
    expect(readout('event-aerobic')).toBe('66%');
    expect(readout('event-anaerobic')).toBe('34%');
    expect(aerobicBar()).toBe('66%');
    click('event', 'marathon');
    expect(readout('event-aerobic')).toBe('99%');
    expect(aerobicBar()).toBe('99%');
  });

  it('adds mitochondria, membrane and motors with training', () => {
    expect(readout('training-share')).toBe('4.8%');
    expect(readout('training-membrane')).toBe('×1.0');
    expect(readout('training-motors')).toBe('4');
    click('training', 'tenWeeks');
    expect(readout('training-share')).toBe('6.8%');
    expect(readout('training-membrane')).toBe('×1.4');
    expect(readout('training-motors')).toBe('6');
    click('training', 'years');
    expect(readout('training-share')).toBe('10%');
    expect(readout('training-membrane')).toBe('×2.5');
    expect(readout('training-motors')).toBe('10');
  });

  it('stops updating once disposed', () => {
    dispose();
    store.getState().setEvent('marathon');
    store.getState().setPhase(130);
    expect(readout('event-aerobic')).toBe('10 to 20%');
    expect(seatState(0)).toBe('open');
  });
});
