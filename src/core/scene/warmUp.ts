export type Cancel = () => void;

const IDLE_TIMEOUT_MS = 2000;

export function whenIdle(callback: () => void): Cancel {
  if (typeof requestIdleCallback === 'function') {
    const handle = requestIdleCallback(callback, { timeout: IDLE_TIMEOUT_MS });
    return () => cancelIdleCallback(handle);
  }
  const timer = setTimeout(callback, 0);
  return () => clearTimeout(timer);
}

export function afterFirstFrameWhenIdle(callback: () => void): Cancel {
  let cancelIdle: Cancel = () => {};
  const frame = window.requestAnimationFrame(() => {
    cancelIdle = whenIdle(callback);
  });
  return () => {
    window.cancelAnimationFrame(frame);
    cancelIdle();
  };
}
