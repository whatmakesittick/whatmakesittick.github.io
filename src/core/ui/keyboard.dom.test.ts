import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Explainer, ExplainerStore } from '../explainer';
import { mountKeyboard } from './keyboard';

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
