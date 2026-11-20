import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createEngineStore } from '../state';
import type { EngineStore } from '../state';
import { mountThrustLever } from './mountThrustLever';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { gauge } = TEST_LOCALE;

function lever(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>('[data-control="thrust"]');
  if (!input) throw new Error('No thrust lever');
  return input;
}

function output(): string | null | undefined {
  return document.querySelector('.gauge-lever output')?.textContent;
}

describe('thrust lever', () => {
  let store: EngineStore;
  let unmount: () => void;

  beforeAll(() => initTestLocale());

  beforeEach(() => {
    document.body.innerHTML = '<aside data-gauge></aside>';
    store = createEngineStore();
    const host = document.querySelector<HTMLElement>('[data-gauge]');
    if (!host) throw new Error('No gauge');
    unmount = mountThrustLever(host, store);
  });

  afterEach(() => unmount());

  it('shows the lever position and labels it', () => {
    expect(lever().value).toBe('0.65');
    expect(output()).toBe(fill(gauge.leverValue, { percent: '65' }));
    expect(document.querySelector('.gauge-lever label')?.textContent).toBe(gauge.lever);
  });

  it('moves the store and follows it', () => {
    lever().value = '0.3';
    lever().dispatchEvent(new Event('input'));
    expect(store.getState().thrust).toBe(0.3);
    store.getState().setThrust(1);
    expect(output()).toBe(gauge.takeoff);
    store.getState().setThrust(0);
    expect(output()).toBe(gauge.idle);
  });

  it('leaves nothing behind when unmounted', () => {
    unmount();
    expect(document.querySelector('.gauge-lever')).toBeNull();
    unmount = () => {};
  });
});
