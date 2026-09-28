export interface Loop {
  request(): void;
  stop(): void;
}

const MILLISECONDS_PER_SECOND = 1000;

export function startLoop(frame: (deltaSeconds: number) => void): Loop {
  let handle = 0;
  let last = 0;
  let scheduled = false;
  let resting = true;
  let stopped = false;

  const run = (now: number) => {
    scheduled = false;
    const deltaSeconds = Math.max(0, (now - last) / MILLISECONDS_PER_SECOND);
    last = now;
    frame(deltaSeconds);
    resting = !scheduled;
  };
  const schedule = () => {
    scheduled = true;
    handle = requestAnimationFrame(run);
  };
  const request = () => {
    if (stopped || scheduled) return;
    if (resting) last = performance.now();
    resting = false;
    if (!document.hidden) schedule();
  };
  const onVisibilityChange = () => {
    if (!document.hidden) {
      if (!resting) {
        resting = true;
        request();
      }
      return;
    }
    cancelAnimationFrame(handle);
    scheduled = false;
  };

  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    request,
    stop: () => {
      stopped = true;
      cancelAnimationFrame(handle);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    },
  };
}
