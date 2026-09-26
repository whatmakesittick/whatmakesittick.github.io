export interface Loop {
  stop(): void;
}

const MILLISECONDS_PER_SECOND = 1000;

export function startLoop(frame: (deltaSeconds: number) => void): Loop {
  let handle = 0;
  let last = 0;
  let running = false;

  const tick = (now: number) => {
    const deltaSeconds = (now - last) / MILLISECONDS_PER_SECOND;
    last = now;
    frame(Math.max(0, deltaSeconds));
    handle = requestAnimationFrame(tick);
  };
  const resume = () => {
    if (running) return;
    running = true;
    last = performance.now();
    handle = requestAnimationFrame(tick);
  };
  const pause = () => {
    running = false;
    cancelAnimationFrame(handle);
  };
  const onVisibilityChange = () => (document.hidden ? pause() : resume());

  document.addEventListener('visibilitychange', onVisibilityChange);
  frame(0);
  if (!document.hidden) resume();

  return {
    stop: () => {
      pause();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    },
  };
}
