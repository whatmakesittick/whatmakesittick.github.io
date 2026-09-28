import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import { mountActions } from '@core/ui/actions';
import chapters from '../../chapters.html?raw';
import en from '../../locales/en.json';
import { momentPhase } from '../model';
import { createWatchStore } from '../state';
import type { WatchStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { mountWatchUi } from '.';

function readout(id: string): string | null | undefined {
  return document.querySelector(`[data-readout="${id}"]`)?.textContent;
}

function click(action: string, value?: string): void {
  const selector = value
    ? `[data-action="${action}"][data-value="${value}"]`
    : `[data-action="${action}"]`;
  document.querySelector<HTMLElement>(selector)?.click();
}

function slide(control: string, value: number): void {
  const input = document.querySelector<HTMLInputElement>(`[data-control="${control}"]`);
  if (!input) throw new Error(`No control ${control}`);
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
}

describe('chapter widgets', () => {
  let store: WatchStore;
  let dispose: () => void;

  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  beforeEach(() => {
    document.body.innerHTML = chapters;
    store = createWatchStore({ playing: false });
    dispose = mountWatchUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  it('shows the spring running down as the reserve slider moves', () => {
    expect(readout('reserve')).toBe('42 h');
    expect(readout('reserve-torque')).toBe('11.3 mN·m');
    expect(readout('reserve-turns')).toBe('5.25 turns');
    expect(readout('reserve-amplitude')).toBe('280°');
    expect(readout('reserve-energy')).toBe('0.29 J');
    slide('reserve', 18);
    expect(readout('reserve')).toBe('18 h');
    expect(readout('reserve-torque')).toBe('9.1 mN·m');
    expect(readout('reserve-amplitude')).toBe('251°');
    slide('reserve', 0);
    expect(readout('reserve-energy')).toBe('0.00 J');
    expect(readout('reserve-turns')).toBe('0.00 turns');
  });

  it('winds the spring from the chip and disables it once full', () => {
    const wind = document.querySelector('[data-action="wind"]');
    expect(wind?.getAttribute('aria-disabled')).toBe('true');
    slide('reserve', 10);
    expect(wind?.getAttribute('aria-disabled')).toBe('false');
    click('wind');
    expect(store.getState().reserve).toBe(42);
    expect(wind?.getAttribute('aria-disabled')).toBe('true');
  });

  it('describes each wheel of the train', () => {
    expect(readout('wheel-teeth')).toBe('80 / 10');
    expect(readout('wheel-turn')).toBe('1 h');
    expect(readout('wheel-ratio')).toBe('× 8');
    click('wheel', 'barrel');
    expect(readout('wheel-teeth')).toBe('80 / –');
    expect(readout('wheel-turn')).toBe('8 h');
    expect(readout('wheel-ratio')).toBe('–');
    click('wheel', 'thirdWheel');
    expect([readout('wheel-teeth'), readout('wheel-turn')]).toEqual(['75 / 10', '7.5 min']);
    click('wheel', 'fourthWheel');
    expect([readout('wheel-turn'), readout('wheel-ratio')]).toEqual(['1 min', '× 7.5']);
    click('wheel', 'escapeWheel');
    expect(readout('wheel-teeth')).toBe('20 / 8');
    expect(readout('wheel-turn')).toBe('5 s');
    expect(readout('wheel-ratio')).toBe('× 12');
    expect(document.querySelector('[data-value="escapeWheel"]')?.getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('follows the escapement through a beat', () => {
    click('moment', 'lock');
    expect(store.getState().phase).toBeCloseTo(momentPhase('lock', 280));
    expect(readout('escapement-fork')).toBe('+5.0°');
    expect(readout('escapement-wheel')).toBe('0.0° of 9°');
    expect(readout('escapement-contact')).toBe('0.0 ms');
    store.getState().setPhase(90);
    expect(readout('escapement-fork')).toBe('0.0°');
    expect(readout('escapement-wheel')).toBe('3.5° of 9°');
    expect(readout('escapement-contact')).toBe('3.6 ms');
    click('moment', 'free');
    expect(readout('escapement-fork')).toBe('-5.0°');
    expect(readout('escapement-wheel')).toBe('9.0° of 9°');
  });

  it('shows what the regulator index does to the rate', () => {
    expect(readout('regulator')).toBe('0.00');
    expect(readout('regulator-rate')).toBe('0.0 s/day');
    expect(readout('regulator-period')).toBe('250.00 ms');
    expect(readout('regulator-length')).toBe('188.5 mm');
    expect(readout('regulator-energy')).toBe('12.1 µJ');
    slide('regulator', 1);
    expect(readout('regulator')).toBe('+1.00');
    expect(readout('regulator-rate')).toBe('+140.8 s/day');
    expect(readout('regulator-period')).toBe('249.59 ms');
    expect(readout('regulator-length')).toBe('187.9 mm');
    expect(document.querySelector('.regulator-control')?.getAttribute('data-rate-band')).toBe(
      'warn',
    );
    store.getState().setReserve(0);
    expect(readout('regulator-energy')).toBe('5.3 µJ');
  });

  it('compares the beat rates', () => {
    expect(readout('beat-perSecond')).toBe('8');
    expect(readout('beat-perDay')).toBe('691,200');
    expect(readout('beat-escape')).toBe('12 rpm');
    click('beatRate', 'vph36000');
    expect(readout('beat-perSecond')).toBe('10');
    expect(readout('beat-perDay')).toBe('864,000');
    expect(readout('beat-steps')).toBe('10');
    expect(readout('beat-escape')).toBe('15 rpm');
    click('beatRate', 'vph18000');
    expect(readout('beat-escape')).toBe('7.5 rpm');
  });

  it('stops updating once disposed', () => {
    dispose();
    store.getState().setBeatRate('vph21600');
    store.getState().setReserve(0);
    expect(readout('beat-perSecond')).toBe('8');
    expect(readout('reserve-torque')).toBe('11.3 mN·m');
  });
});
