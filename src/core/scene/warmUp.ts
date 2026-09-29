export type Cancel = () => void;

const IDLE_TIMEOUT_MS = 2000;

function whenIdle(callback: () => void): Cancel {
  if ('requestIdleCallback' in window) {
    const handle = window.requestIdleCallback(callback, { timeout: IDLE_TIMEOUT_MS });
    return () => window.cancelIdleCallback(handle);
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
