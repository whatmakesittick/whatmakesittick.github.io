const TEXT_REFRESH_RATE_HZ = 30;
const MILLISECONDS_PER_SECOND = 1000;

export const TEXT_REFRESH_INTERVAL_MS = MILLISECONDS_PER_SECOND / TEXT_REFRESH_RATE_HZ;

export function throttle<A extends unknown[]>(
  callback: (...args: A) => void,
  intervalMs: number,
): (...args: A) => void {
  let lastRun = Number.NEGATIVE_INFINITY;
  let latestArgs: A;
  let timer: number | undefined;

  const run = () => {
    timer = undefined;
    lastRun = performance.now();
    callback(...latestArgs);
  };

  return (...args: A) => {
    latestArgs = args;
    if (timer !== undefined) return;
    const wait = lastRun + intervalMs - performance.now();
    if (wait <= 0) run();
    else timer = window.setTimeout(run, wait);
  };
}

export function debounce(callback: () => void, delayMs: number): () => void {
  let timer: number | undefined;
  return () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(callback, delayMs);
  };
}
