import { afterEach, describe, expect, it, vi } from 'vitest';
import { afterFirstFrameWhenIdle, whenIdle } from './warmUp';

describe('warm up', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('waits for the first frame and then for idle time', () => {
    const frames: FrameRequestCallback[] = [];
    const idles: IdleRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      frames.push(callback),
    );
    vi.stubGlobal('requestIdleCallback', (callback: IdleRequestCallback) => idles.push(callback));
    const task = vi.fn();
    afterFirstFrameWhenIdle(task);
    expect(idles).toHaveLength(0);
    frames[0](0);
    expect(task).not.toHaveBeenCalled();
    idles[0]({ didTimeout: false, timeRemaining: () => 10 });
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('never runs once cancelled', () => {
    const frames: FrameRequestCallback[] = [];
    const cancelFrame = vi.fn();
    const cancelIdle = vi.fn();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      frames.push(callback),
    );
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    vi.stubGlobal('requestIdleCallback', () => 7);
    vi.stubGlobal('cancelIdleCallback', cancelIdle);
    const cancel = afterFirstFrameWhenIdle(vi.fn());
    frames[0](0);
    cancel();
    expect(cancelFrame).toHaveBeenCalled();
    expect(cancelIdle).toHaveBeenCalledWith(7);
  });

  it('runs a task in idle time and cancels it', () => {
    const idles: IdleRequestCallback[] = [];
    const cancelIdle = vi.fn();
    vi.stubGlobal('requestIdleCallback', (callback: IdleRequestCallback) => idles.push(callback));
    vi.stubGlobal('cancelIdleCallback', cancelIdle);
    const task = vi.fn();
    const cancel = whenIdle(task);
    idles[0]({ didTimeout: false, timeRemaining: () => 10 });
    expect(task).toHaveBeenCalledTimes(1);
    cancel();
    expect(cancelIdle).toHaveBeenCalledWith(1);
  });

  it('falls back to a timer where the browser has no idle callback', () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestIdleCallback', undefined);
    const task = vi.fn();
    whenIdle(task);
    vi.runAllTimers();
    expect(task).toHaveBeenCalledTimes(1);
    whenIdle(task)();
    vi.runAllTimers();
    expect(task).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
