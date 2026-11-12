import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mountActions } from '@core/ui/actions';
import { TEXT_REFRESH_INTERVAL_MS } from '@core/ui/throttle';
import { BOUNCE_UNITS, MOMENTS, bounceCountAt, unitsAfterBounce } from '../model';
import { createEuvStore } from '../state';
import type { EuvStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { CHAPTER_MARKUP, TEST_LOCALE, fill, initTestLocale, isFilled } from './testing';
import { mountEuvUi } from '.';

const { units, chapters } = TEST_LOCALE;
const BOUNCE_STEPS = [0, 5, 11];
const MACHINE_READOUT_IDS = [
  'wph',
  'perWafer',
  'perField',
  'slit',
  'overlay',
  'shrink',
  'field',
  'line',
  'tilt',
];

function readout(id: string): string | null | undefined {
  return document.querySelector(`[data-readout="${id}"]`)?.textContent;
}

function click(action: string, value: string): void {
  document.querySelector<HTMLElement>(`[data-action="${action}"][data-value="${value}"]`)?.click();
}

function slide(value: number): void {
  const input = document.querySelector<HTMLInputElement>('[data-control="bounce"]');
  if (!input) throw new Error('No bounce control');
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
}

function nextRefresh(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, TEXT_REFRESH_INTERVAL_MS + 1));
}

describe('chapter readouts and the bounce range', () => {
  let store: EuvStore;
  let dispose: () => void;

  beforeAll(() => initTestLocale());

  beforeEach(() => {
    document.body.innerHTML = CHAPTER_MARKUP;
    store = createEuvStore({ playing: false, phase: 0 });
    dispose = mountEuvUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  afterEach(() => dispose());

  it('fills every readout in the page with a finished text', () => {
    const nodes = [...document.querySelectorAll('[data-readout]')];
    expect(nodes.length).toBeGreaterThan(0);
    nodes.forEach((node) =>
      expect(isFilled(node.textContent), node.getAttribute('data-readout') ?? '').toBe(true),
    );
  });

  it('changes the machine readouts with the machine', () => {
    click('machine', 'nxe3600d');
    const before = MACHINE_READOUT_IDS.map(readout);
    click('machine', 'exe5000');
    expect(store.getState().machine).toBe('exe5000');
    const after = MACHINE_READOUT_IDS.map(readout);
    MACHINE_READOUT_IDS.forEach((id, index) => {
      if (id !== 'overlay') expect(after[index], id).not.toBe(before[index]);
    });
    click('machine', 'nxe3800e');
    expect(readout('overlay')).toBe(fill(chapters.scan.overlayValue, { nm: '0.9' }));
  });

  it.each(BOUNCE_STEPS)(
    'seeks the phase to %i bounces, pauses and follows with its readouts',
    async (count) => {
      store.getState().play();
      slide(count);
      await nextRefresh();
      expect(store.getState().playing).toBe(false);
      expect(store.getState().phase).toBe(unitsAfterBounce(count));
      expect(bounceCountAt(store.getState().phase)).toBe(count);
      expect(document.querySelector('output[for="bounce-range"]')?.textContent).toBe(
        fill(chapters.mirrors.bounce.output, { count: String(count) }),
      );
      const left = 0.7 ** count * 100;
      expect(readout('bounceLight')).toBe(
        fill(units.percent, { value: left < 10 ? left.toFixed(1) : left.toFixed(0) }),
      );
      const lost = 100 - left;
      expect(readout('bounceLeft')).toBe(
        fill(units.percent, { value: lost < 10 ? lost.toFixed(1) : lost.toFixed(0) }),
      );
    },
  );

  it('shows about 2.0 percent left after 11 bounces and moves the slider with the phase', async () => {
    slide(11);
    await nextRefresh();
    expect(readout('bounceLight')).toBe(fill(units.percent, { value: '2.0' }));
    store.getState().setPhase(MOMENTS.atFocus);
    await nextRefresh();
    expect(document.querySelector<HTMLInputElement>('[data-control="bounce"]')?.value).toBe('0');
    store.getState().setPhase(BOUNCE_UNITS[2]);
    await nextRefresh();
    expect(document.querySelector<HTMLInputElement>('[data-control="bounce"]')?.value).toBe('3');
  });
});
