import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startLoop } from './loop';

const FRAME_MS = 16;

interface FrameQueue {
  pending(): number;
  flush(at: number): void;
}

function stubAnimationFrames(): FrameQueue {
  let queue = new Map<number, FrameRequestCallback>();
  let next = 1;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    queue.set(next, callback);
    return next++;
  });
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => queue.delete(handle));
  return {
    pending: () => queue.size,
    flush: (at) => {
      const due = queue;
      queue = new Map();
      due.forEach((callback) => callback(at));
    },
  };
}

describe('startLoop', () => {
  let frames: FrameQueue;
  let now = 0;

  beforeEach(() => {
    frames = stubAnimationFrames();
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('draws nothing until a frame is requested', () => {
    const frame = vi.fn();
    const loop = startLoop(frame);
    expect(frames.pending()).toBe(0);
    loop.request();
    loop.request();
    expect(frames.pending()).toBe(1);
    frames.flush(FRAME_MS);
    expect(frame).toHaveBeenCalledTimes(1);
    expect(frames.pending()).toBe(0);
    loop.stop();
  });

  it('keeps going while each frame asks for the next one', () => {
    const deltas: number[] = [];
    const loop = startLoop((deltaSeconds) => {
      deltas.push(deltaSeconds);
      if (deltas.length < 3) loop.request();
    });
    loop.request();
    [1, 2, 3, 4].forEach((count) => frames.flush(count * FRAME_MS));
    expect(deltas).toEqual([FRAME_MS / 1000, FRAME_MS / 1000, FRAME_MS / 1000]);
    loop.stop();
  });

  it('starts timing afresh after resting', () => {
    const deltas: number[] = [];
    const loop = startLoop((deltaSeconds) => deltas.push(deltaSeconds));
    loop.request();
    frames.flush(FRAME_MS);
    now = 5000;
    loop.request();
    frames.flush(now + FRAME_MS);
    expect(deltas[1]).toBe(FRAME_MS / 1000);
    loop.stop();
  });

  it('ignores requests once stopped', () => {
    const loop = startLoop(vi.fn());
    loop.stop();
    loop.request();
    expect(frames.pending()).toBe(0);
  });
});
