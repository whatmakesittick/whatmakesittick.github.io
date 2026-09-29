import { afterEach, describe, expect, it, vi } from 'vitest';
import { afterFirstFrameWhenIdle } from './warmUp';

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
});
