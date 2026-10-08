import { beforeAll, describe, expect, it } from 'vitest';
import { RATED_WIND_MS } from '../model';
import { createWindFarmStore } from '../state';
import { mountWindOverride } from './mountWindOverride';
import { initTestLocale } from './testing';

const FIRST_ID = 'tower-wind';
const SECOND_ID = 'curve-wind';

function slider(id: string): string {
  return `<input id="${id}" type="range" class="range" data-control="wind-override" />`;
}

function widget(id: string, inner: string): string {
  return `<div class="range-widget"><output class="number" for="${id}"></output>${inner}</div>`;
}

describe('wind override slider', () => {
  beforeAll(() => initTestLocale());

  it('drives its own widget when the markup wraps the slider', () => {
    document.body.innerHTML =
      widget(FIRST_ID, slider(FIRST_ID)) + widget(SECOND_ID, `<div>${slider(SECOND_ID)}</div>`);
    const store = createWindFarmStore({ playing: false });
    const dispose = mountWindOverride(document, store, SECOND_ID);
    const input = document.querySelector<HTMLInputElement>(`#${SECOND_ID}`);
    if (!input) throw new Error('Missing slider');
    input.value = String(RATED_WIND_MS);
    input.dispatchEvent(new Event('input'));
    expect(store.getState().windOverride).toBe(RATED_WIND_MS);
    expect(document.querySelector(`output[for="${SECOND_ID}"]`)?.textContent).not.toBe('');
    expect(document.querySelector(`output[for="${FIRST_ID}"]`)?.textContent).toBe('');
    dispose();
  });

  it('refuses a slider outside a range widget instead of binding another one', () => {
    document.body.innerHTML = widget(FIRST_ID, slider(FIRST_ID)) + slider(SECOND_ID);
    expect(() => mountWindOverride(document, createWindFarmStore(), SECOND_ID)).toThrow(
      `#${SECOND_ID}`,
    );
  });
});
