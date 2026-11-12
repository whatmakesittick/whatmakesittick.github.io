import { afterEach, describe, expect, it, vi } from 'vitest';
import { runNow, runPaced, yieldToMain } from './pacing';
import type { Steps } from './pacing';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function* countTo(limit: number): Steps<number> {
  let total = 0;
  for (let count = 0; count < limit; count += 1) {
    total += count;
    yield;
  }
  return total;
}

describe('yieldToMain', () => {
  it('uses scheduler.yield when the browser has it', async () => {
    const yielded = vi.fn(() => Promise.resolve());
    vi.stubGlobal('scheduler', { yield: yielded });
    await yieldToMain();
    expect(yielded).toHaveBeenCalledTimes(1);
  });

  it('falls back to a timer without scheduler.yield', async () => {
    vi.stubGlobal('scheduler', undefined);
    vi.useFakeTimers();
    let resumed = false;
    void yieldToMain().then(() => (resumed = true));
    await Promise.resolve();
    expect(resumed).toBe(false);
    await vi.runAllTimersAsync();
    expect(resumed).toBe(true);
    vi.useRealTimers();
  });
});

describe('stepped builds', () => {
  it('returns the build result', async () => {
    await expect(runPaced(countTo(4))).resolves.toBe(6);
    expect(runNow(countTo(4))).toBe(6);
  });

  it('yields to the browser only once the slice budget is spent', async () => {
    const yielded = vi.fn(() => Promise.resolve());
    vi.stubGlobal('scheduler', { yield: yielded });
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => (now += 10));
    await runPaced(countTo(6));
    expect(yielded.mock.calls.length).toBeGreaterThan(0);
    expect(yielded.mock.calls.length).toBeLessThan(6);
  });
});
