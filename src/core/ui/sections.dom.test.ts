import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExplainerStore } from '../explainer';
import { mountSections } from './sections';

class FakeIntersectionObserver {
  static latest: FakeIntersectionObserver | undefined;
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    FakeIntersectionObserver.latest = this;
  }

  observe(): void {}

  disconnect(): void {}

  cross(target: Element): void {
    const entry = { isIntersecting: true, target } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

const PRESETS = ['intro', 'detail'];
const state = { preset: 'intro', applyPreset: vi.fn() };
const store = { getState: () => state } as unknown as ExplainerStore;

function chapter(preset: string): Element {
  const element = document.querySelector(`[data-preset="${preset}"]`);
  if (!element) throw new Error(`No chapter ${preset}`);
  return element;
}

function latestObserver(): FakeIntersectionObserver {
  const observer = FakeIntersectionObserver.latest;
  if (!observer) throw new Error('No observer');
  return observer;
}

describe('reading-line sections beside an expanded stage', () => {
  const listeners: ((expanded: boolean) => void)[] = [];
  const expansion = {
    expanded: false,
    onChange: (listener: (expanded: boolean) => void) => {
      listeners.push(listener);
      return () => {};
    },
  };

  const setExpanded = (expanded: boolean) => {
    expansion.expanded = expanded;
    listeners.forEach((listener) => listener(expanded));
  };

  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    state.applyPreset.mockClear();
    listeners.length = 0;
    expansion.expanded = false;
    document.body.innerHTML = `
      <section data-stage></section>
      <section class="chapter" data-preset="intro"></section>
      <section class="chapter" data-preset="detail"></section>
    `;
    mountSections(document, store, PRESETS, expansion);
  });

  afterAll(() => vi.unstubAllGlobals());

  it('leaves the chapter alone while the stage is expanded', () => {
    setExpanded(true);
    latestObserver().cross(chapter('detail'));
    expect(state.applyPreset).not.toHaveBeenCalled();
  });

  it('measures the reading line again after the stage collapses', () => {
    const beforeExpanding = latestObserver();
    setExpanded(true);
    setExpanded(false);
    expect(latestObserver()).not.toBe(beforeExpanding);

    latestObserver().cross(chapter('detail'));
    expect(state.applyPreset).toHaveBeenCalledWith('detail');
  });
});
