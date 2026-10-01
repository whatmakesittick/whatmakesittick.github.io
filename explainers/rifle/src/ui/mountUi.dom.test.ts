import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import { mountActions } from '@core/ui/actions';
import { TEXT_REFRESH_INTERVAL_MS } from '@core/ui/throttle';
import chapters from '../../chapters.html?raw';
import en from '../../locales/en.json';
import { EXIT_MS, MOMENTS, REAR_MS, msAt, unitsAt } from '../model';
import { createRifleStore } from '../state';
import type { RifleStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { fill } from './testing';
import { mountRifleUi } from '.';

const { units } = en;

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

function nextRefresh(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, TEXT_REFRESH_INTERVAL_MS + 1));
}

function slide(control: string, value: number): void {
  const input = document.querySelector<HTMLInputElement>(`[data-control="${control}"]`);
  if (!input) throw new Error(`No control ${control}`);
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
}

function output(control: string): string | null | undefined {
  return document.querySelector(`output[for="${control}"]`)?.textContent;
}

describe('chapter widgets', () => {
  let store: RifleStore;
  let dispose: () => void;

  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  beforeEach(() => {
    document.body.innerHTML = chapters;
    store = createRifleStore({ playing: false, phase: 0 });
    dispose = mountRifleUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  afterEach(() => dispose());

  it('counts down to the next shot in the overview', () => {
    expect(readout('overview-cycle')).toBe(fill(units.ms, { value: '100' }));
    expect(readout('overview-pace')).toBe(fill(units.perMinute, { value: '600' }));
    expect(readout('overview-left')).toBe(fill(units.ms, { value: '100' }));
    click('moment', 'strike');
    expect(readout('overview-left')).toBe(fill(units.ms, { value: '96' }));
    expect(pressed('moment', 'strike')).toBe('true');
  });

  it('builds the pressure in the cartridge chapter', () => {
    click('moment', 'strike');
    expect(readout('cartridge-pressure')).toBe(fill(units.mpa, { value: '0' }));
    expect(readout('cartridge-travel')).toBe(fill(units.mm, { value: '0' }));
    click('moment', 'start');
    expect(readout('cartridge-pressure')).toBe(fill(units.mpa, { value: '29' }));
    click('moment', 'peak');
    expect(readout('cartridge-pressure')).toBe(fill(units.mpa, { value: '275' }));
    expect(readout('cartridge-air')).toBe(fill(units.timesAir, { value: '2,700' }));
    expect(readout('cartridge-travel')).toBe(fill(units.mm, { value: '50' }));
  });

  it('follows the hammer and the bolt in the firing chapter', () => {
    expect(readout('firing-hammer')).toBe(en.firing.hammer.falling);
    expect(readout('firing-lock')).toBe(en.firing.lock.locked);
    click('moment', 'start');
    expect(readout('firing-hammer')).toBe(en.firing.hammer.struck);
    expect(readout('firing-pressure')).toBe(fill(units.mpa, { value: '29' }));
    click('moment', 'unlock');
    expect(readout('firing-lock')).toBe(en.firing.lock.open);
    store.getState().seekTime(50);
    expect(readout('firing-hammer')).toBe(en.firing.hammer.cocked);
  });

  it('moves the bullet with the travel slider and pauses the cycle', async () => {
    expect(output('bullet-travel')).toBe(fill(units.mm, { value: '0' }));
    store.getState().play();
    slide('bullet-travel', 386);
    await nextRefresh();
    expect(store.getState().playing).toBe(false);
    expect(msAt(store.getState().phase)).toBeCloseTo(EXIT_MS, 6);
    expect(output('bullet-travel')).toBe(fill(units.mm, { value: '386' }));
    expect(readout('barrel-speed')).toBe(fill(units.metresPerSecond, { value: '715' }));
    expect(readout('barrel-spin')).toBe(fill(units.turnsPerSecond, { value: '3,000' }));
    expect(readout('barrel-turns')).toBe(fill(units.turns, { value: '1.5' }));
    slide('bullet-travel', 50);
    await nextRefresh();
    expect(readout('barrel-pressure')).toBe(fill(units.mpa, { value: '275' }));
  });

  it('fills the gas chamber and stops the reload with the port blocked', () => {
    click('moment', 'exit');
    expect(readout('gas-fill')).toBe(fill(units.percent, { value: '100' }));
    expect(readout('gas-result')).toBe(en.gas.result.open);
    store.getState().seekTime(REAR_MS);
    expect(readout('gas-carrier')).toBe(fill(units.percent, { value: '100' }));
    click('gasPort', 'blocked');
    expect(pressed('gasPort', 'blocked')).toBe('true');
    expect(readout('gas-carrier')).toBe(fill(units.percent, { value: '0' }));
    expect(readout('gas-result')).toBe(en.gas.result.blocked);
    click('moment', 'exit');
    expect(readout('gas-fill')).toBe(fill(units.percent, { value: '0' }));
  });

  it('throws the case out and feeds the next round in the reload chapter', () => {
    click('moment', 'unlock');
    expect(readout('reload-case')).toBe(en.reload.case.held);
    expect(readout('reload-round')).toBe(en.reload.round.waiting);
    click('moment', 'eject');
    expect(readout('reload-case')).toBe(en.reload.case.flying);
    store.getState().seekTime(MOMENTS.eject + 5);
    expect(readout('reload-case')).toBe(en.reload.case.flying);
    store.getState().seekTime(REAR_MS);
    expect(readout('reload-carrier')).toBe(fill(units.percent, { value: '100' }));
    expect(readout('reload-left')).toBe(fill(units.ms, { value: '55' }));
    click('moment', 'strip');
    expect(readout('reload-round')).toBe(en.reload.round.feeding);
    click('moment', 'lock');
    expect(readout('reload-round')).toBe(en.reload.round.chambered);
    expect(readout('reload-case')).toBe(en.reload.case.gone);
  });

  it('compares one cycle with what the reader picks', () => {
    expect(readout('reload-compare')).toBe(en.reload.compare.blink);
    click('comparison', 'sound');
    expect(pressed('comparison', 'sound')).toBe('true');
    expect(readout('reload-compare')).toBe(fill(en.reload.compare.sound, { metres: '34' }));
    click('comparison', 'car');
    expect(readout('reload-compare')).toBe(fill(en.reload.compare.car, { metres: '2.8' }));
  });

  it('stops updating once disposed', () => {
    dispose();
    store.getState().setPhase(unitsAt(REAR_MS));
    expect(readout('overview-left')).toBe(fill(units.ms, { value: '100' }));
  });
});
