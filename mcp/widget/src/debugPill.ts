export type ProbeKind = 'move' | 'down' | 'click' | 'enter' | 'leave' | 'blur';

export interface ProbeRecord {
  k: ProbeKind;
  x: number;
  y: number;
  t: number;
}

export interface DebugPillOptions {
  displayMode: () => string | undefined;
  debug: (note: string) => void;
  probe: (records: ProbeRecord[]) => void;
  probeMs?: number;
}

const SLOT = '.dock-slot';
const SHIFT = 'translateY(-60px)';
const PROBE_MS = 20000;
const FLUSH_MS = 300;
const PROBE_BATCH = 200;
const PROBE_QUEUE_MAX = 4000;
const MIN_STEP = 2;
const TOP = '2147483647';
const GRID =
  'linear-gradient(to right, rgba(255,0,0,0.25) 1px, transparent 1px),' +
  'linear-gradient(to bottom, rgba(255,0,0,0.25) 1px, transparent 1px)';

export function createProbeRecorder(send: (records: ProbeRecord[]) => void) {
  const queue: ProbeRecord[] = [];
  let last: { x: number; y: number } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    timer = undefined;
    const batch = queue.splice(0, PROBE_BATCH);
    if (batch.length) send(batch);
    if (queue.length) timer = setTimeout(flush, FLUSH_MS);
  };
  return {
    record(k: ProbeKind, x: number, y: number, t: number) {
      if (k === 'move') {
        if (last && Math.abs(x - last.x) < MIN_STEP && Math.abs(y - last.y) < MIN_STEP) return;
        last = { x, y };
      }
      if (queue.length >= PROBE_QUEUE_MAX) return;
      queue.push({ k, x: Math.round(x), y: Math.round(y), t: Math.round(t) });
      if (!timer) timer = setTimeout(flush, FLUSH_MS);
    },
    flush() {
      if (timer) clearTimeout(timer);
      timer = undefined;
      while (queue.length) send(queue.splice(0, PROBE_BATCH));
    },
  };
}

function startProbe(doc: Document, options: DebugPillOptions, done: () => void): () => void {
  const win = doc.defaultView ?? window;
  const recorder = createProbeRecorder(options.probe);
  const overlay = doc.createElement('div');
  overlay.dataset.debug = 'probe';
  overlay.style.cssText =
    `position:fixed;inset:0;z-index:${TOP};pointer-events:auto;cursor:crosshair;` +
    `background-image:${GRID};background-size:50px 50px;`;
  const label = doc.createElement('div');
  label.style.cssText =
    'position:absolute;top:8px;right:8px;padding:2px 6px;font:12px monospace;' +
    'background:rgba(0,0,0,0.7);color:white;border-radius:4px;pointer-events:none';
  overlay.append(label);
  doc.body.append(overlay);
  const ends = performance.now() + (options.probeMs ?? PROBE_MS);
  const tick = () => {
    label.textContent = `probe ${Math.max(0, Math.ceil((ends - performance.now()) / 1000))}s`;
  };
  tick();
  const ticker = win.setInterval(tick, 250);
  const at = (event: Event, k: ProbeKind) => {
    const e = event as PointerEvent;
    recorder.record(k, e.clientX ?? -1, e.clientY ?? -1, event.timeStamp);
  };
  const onMove = (e: Event) => at(e, 'move');
  const onDown = (e: Event) => at(e, 'down');
  const onClick = (e: Event) => at(e, 'click');
  const onOut = (e: Event) => {
    if (!(e as PointerEvent).relatedTarget) at(e, 'leave');
  };
  const onOver = (e: Event) => {
    if (!(e as PointerEvent).relatedTarget) at(e, 'enter');
  };
  const onBlur = (e: Event) => {
    if (e.target === win) recorder.record('blur', -1, -1, e.timeStamp);
  };
  const listeners: [string, (e: Event) => void][] = [
    ['pointermove', onMove],
    ['pointerdown', onDown],
    ['click', onClick],
    ['pointerout', onOut],
    ['pointerover', onOver],
    ['blur', onBlur],
  ];
  for (const [type, fn] of listeners) win.addEventListener(type, fn, { capture: true });
  options.debug('probe start');
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    win.clearTimeout(timeout);
    win.clearInterval(ticker);
    for (const [type, fn] of listeners) win.removeEventListener(type, fn, { capture: true });
    overlay.remove();
    recorder.flush();
    options.debug('probe end');
    done();
  };
  const timeout = win.setTimeout(stop, options.probeMs ?? PROBE_MS);
  return stop;
}

export function installDebugPill(doc: Document, options: DebugPillOptions): () => void {
  const win = doc.defaultView ?? window;
  const pill = doc.createElement('div');
  pill.dataset.debug = 'pill';
  pill.style.cssText =
    `position:fixed;top:24px;left:24px;z-index:${TOP};display:flex;gap:6px;padding:4px;` +
    'border-radius:999px;background:rgba(0,0,0,0.75);font:12px system-ui;pointer-events:auto';
  const button = (text: string) => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.style.cssText =
      'padding:4px 10px;border:0;border-radius:999px;background:white;color:black;' +
      'font:inherit;cursor:pointer';
    pill.append(b);
    return b;
  };
  const up = button('dock up 60');
  const probe = button('probe');
  up.addEventListener('click', () => {
    const slot = doc.querySelector<HTMLElement>(SLOT);
    if (!slot) {
      options.debug('dock up: no dock slot');
      return;
    }
    const shifted = slot.style.transform !== SHIFT;
    slot.style.transform = shifted ? SHIFT : '';
    up.textContent = shifted ? 'dock back' : 'dock up 60';
    win.requestAnimationFrame(() => options.debug(`dock up ${shifted ? 'on' : 'off'}`));
  });
  let stopProbe: (() => void) | undefined;
  probe.addEventListener('click', () => {
    if (stopProbe) return;
    probe.disabled = true;
    stopProbe = startProbe(doc, options, () => {
      stopProbe = undefined;
      probe.disabled = false;
    });
  });
  doc.body.append(pill);
  const sync = () => {
    pill.hidden = options.displayMode() !== 'fullscreen';
    if (!doc.body.contains(pill)) doc.body.append(pill);
  };
  sync();
  const interval = win.setInterval(sync, 500);
  return () => {
    win.clearInterval(interval);
    stopProbe?.();
    pill.remove();
  };
}
