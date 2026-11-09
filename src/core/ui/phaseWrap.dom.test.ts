import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { wrapPhaseButtons } from './phaseWrap';

let notify: () => void = () => {};
const observed: Element[] = [];

class ManualResizeObserver {
  constructor(callback: () => void) {
    notify = callback;
  }

  observe(target: Element): void {
    observed.push(target);
  }

  disconnect(): void {
    observed.length = 0;
  }
}

function size(element: Element, property: 'scrollWidth' | 'clientWidth', value: number): void {
  Object.defineProperty(element, property, { configurable: true, value });
}

function mountChips() {
  document.body.innerHTML = `
    <div class="scrubber">
      <div data-phase-buttons><button>Hakenrampe</button><button>Hängepause</button></div>
    </div>
  `;
  const group = document.querySelector<HTMLElement>('[data-phase-buttons]')!;
  return { group, area: group.parentElement! };
}

describe('wrapPhaseButtons', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ManualResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
    observed.length = 0;
  });

  it('keeps the chips on one row while they fit', () => {
    const { group, area } = mountChips();
    size(area, 'clientWidth', 400);
    size(group, 'scrollWidth', 400);
    wrapPhaseButtons(document);
    notify();
    expect(group.hasAttribute('data-wrap')).toBe(false);
  });

  it('wraps the chips when one row is wider than the scrubber', () => {
    const { group, area } = mountChips();
    size(area, 'clientWidth', 400);
    size(group, 'scrollWidth', 520);
    wrapPhaseButtons(document);
    notify();
    expect(group.hasAttribute('data-wrap')).toBe(true);
    size(area, 'clientWidth', 600);
    notify();
    expect(group.hasAttribute('data-wrap')).toBe(false);
  });

  it('leaves hidden chips alone', () => {
    const { group, area } = mountChips();
    size(area, 'clientWidth', 0);
    size(group, 'scrollWidth', 520);
    wrapPhaseButtons(document);
    notify();
    expect(group.hasAttribute('data-wrap')).toBe(false);
  });

  it('watches the scrubber and every chip, so a new language refits the row', () => {
    const { group, area } = mountChips();
    const dispose = wrapPhaseButtons(document);
    expect(observed).toEqual([area, ...group.children]);
    dispose();
    expect(observed).toEqual([]);
  });
});
