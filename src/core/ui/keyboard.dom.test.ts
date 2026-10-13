import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Explainer, ExplainerStore } from '../explainer';
import { createKeyHandler, mountKeyboard } from './keyboard';

const explainer = {
  timeline: { phases: [], nudge: { fine: 1, coarse: 10 }, speed: { step: 1 } },
  dock: { toggles: [], choices: [] },
} as unknown as Explainer;

const state = { resetCamera: vi.fn() };
const store = { getState: () => state } as unknown as ExplainerStore;

function press(key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  document.dispatchEvent(event);
  return event;
}

describe('keyboard shell keys', () => {
  const toggle = vi.fn(() => true);
  const close = vi.fn(() => false);
  let unmount: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    unmount = mountKeyboard(document, store, explainer, { x: toggle, escape: close });
  });

  afterEach(() => unmount());

  it('runs a shell key and consumes it', () => {
    expect(press('X').defaultPrevented).toBe(true);
    expect(toggle).toHaveBeenCalledOnce();
  });

  it('lets a key through when its shell handler has nothing to do', () => {
    expect(press('Escape').defaultPrevented).toBe(false);
    expect(close).toHaveBeenCalledOnce();
  });

  it('keeps the playback keys working beside the shell keys', () => {
    expect(press('r').defaultPrevented).toBe(true);
    expect(state.resetCamera).toHaveBeenCalledOnce();
  });

  it('stops listening once unmounted', () => {
    unmount();
    press('x');
    expect(toggle).not.toHaveBeenCalled();
  });
});

describe('key handler', () => {
  const playback = { step: vi.fn(), setSpeed: vi.fn(), speed: 2 };
  const playbackStore = { getState: () => playback } as unknown as ExplainerStore;

  function key(name: string, init: KeyboardEventInit = {}, target: Element = document.body) {
    const event = new KeyboardEvent('keydown', {
      key: name,
      bubbles: true,
      cancelable: true,
      ...init,
    });
    Object.defineProperty(event, 'target', { value: target });
    return event;
  }

  beforeEach(() => vi.clearAllMocks());

  it('moves the timeline with the arrows and consumes them', () => {
    const handle = createKeyHandler(playbackStore, explainer);
    const right = key('ArrowRight');
    expect(handle(right)).toBe(true);
    expect(right.defaultPrevented).toBe(true);
    expect(handle(key('ArrowLeft', { shiftKey: true }))).toBe(true);
    expect(handle(key('ArrowUp'))).toBe(true);
    expect(playback.step.mock.calls).toEqual([[1], [-10]]);
    expect(playback.setSpeed).toHaveBeenCalledWith(3);
  });

  it('leaves keys to a focused field, to modifiers and to unbound keys', () => {
    const handle = createKeyHandler(playbackStore, explainer);
    const inField = key('ArrowRight', {}, document.createElement('input'));
    expect(handle(inField)).toBe(false);
    expect(inField.defaultPrevented).toBe(false);
    expect(handle(key('ArrowRight', { metaKey: true }))).toBe(false);
    expect(handle(key('q'))).toBe(false);
    expect(playback.step).not.toHaveBeenCalled();
  });
});
