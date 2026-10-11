import type { App } from '@modelcontextprotocol/ext-apps';
import { TOOL_REPORT_POINTER_EVENTS } from '../../shared/tools.ts';
import { watchDockAb } from './dockAb.ts';

export interface PointerLogPoint {
  x: number;
  y: number;
}

export interface PointerLogRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PointerLogRecord {
  type: string;
  pointerType?: string;
  button?: number;
  isPrimary?: boolean;
  client?: PointerLogPoint;
  screen?: PointerLogPoint;
  offset?: PointerLogPoint;
  target: string;
  hit?: string;
  targetControl?: string;
  hitControl?: string;
  capturePrevented: boolean;
  defaultPrevented?: boolean;
  reachedBubble: boolean;
  timeStamp: number;
  displayMode?: string;
  viewport: { width: number; height: number; dpr: number };
  visualViewport?: PointerLogRect & { scale: number };
  documentRect: PointerLogRect;
  dockRect?: PointerLogRect;
  sinceDownMs?: number;
  sameAsDown?: boolean;
  note?: string;
}

const EVENTS = [
  'pointerdown',
  'pointerup',
  'click',
  'mousedown',
  'touchstart',
  'pointercancel',
  'lostpointercapture',
  'pointerover',
  'pointerout',
  'pointermove',
  'blur',
  'focus',
] as const;
const CONTROL = 'button,[role=slider],input,a';
const DOCK = '.dock-slot .dock, .dock-fallback:not([hidden]), .dock-slot';
const ANCESTORS = 6;
const CLICK_WINDOW_MS = 600;
const FLUSH_MS = 300;
const BATCH = 20;
const QUEUE_MAX = 200;
const MOVE_MS = 120;

const round = (n: number) => Math.round(n * 10) / 10;

function rect(r: DOMRect | { x: number; y: number; width: number; height: number }) {
  return { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) };
}

export function describeElement(node: Element): string {
  const tag = node.tagName.toLowerCase();
  const id = node.id ? `#${node.id}` : '';
  const debug = node.getAttribute('data-debug');
  const tagged = debug ? `[debug=${debug}]` : '';
  const classes = (node.getAttribute('class') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((c) => `.${c}`)
    .join('');
  return `${tag}${id}${tagged}${classes}`.slice(0, 100);
}

export function elementPath(node: unknown): string {
  if (node && (node as Window).window === node) return 'window';
  if (!node || typeof (node as Element).tagName !== 'string') {
    return node && (node as Node).nodeName ? (node as Node).nodeName.toLowerCase() : 'none';
  }
  const parts: string[] = [];
  let current: Element | null = node as Element;
  while (current && parts.length <= ANCESTORS) {
    parts.push(describeElement(current));
    current = current.parentElement;
  }
  return parts.join(' < ');
}

function controlOf(node: unknown): Element | null {
  if (!node || typeof (node as Element).closest !== 'function') return null;
  return (node as Element).closest(CONTROL);
}

function pointOf(event: Event): { client?: PointerLogPoint; screen?: PointerLogPoint } {
  const touch = (event as TouchEvent).touches?.[0] ?? (event as TouchEvent).changedTouches?.[0];
  const source = touch ?? (event as MouseEvent);
  if (typeof source.clientX !== 'number') return {};
  return {
    client: { x: round(source.clientX), y: round(source.clientY) },
    screen: { x: round(source.screenX), y: round(source.screenY) },
  };
}

export function serializePointerEvent(
  event: Event,
  doc: Document,
  displayMode: string | undefined,
): PointerLogRecord {
  const win = doc.defaultView ?? window;
  const mouse = event as MouseEvent;
  const pointer = event as PointerEvent;
  const { client, screen } = pointOf(event);
  const hitElement = client ? doc.elementFromPoint(client.x, client.y) : null;
  const targetControl = controlOf(event.target);
  const hitControl = controlOf(hitElement);
  const vv = win.visualViewport;
  const dock = doc.querySelector(DOCK);
  return {
    type: event.type,
    ...(typeof pointer.pointerType === 'string' ? { pointerType: pointer.pointerType } : {}),
    ...(typeof mouse.button === 'number' ? { button: mouse.button } : {}),
    ...(typeof pointer.isPrimary === 'boolean' ? { isPrimary: pointer.isPrimary } : {}),
    ...(client ? { client } : {}),
    ...(screen ? { screen } : {}),
    ...(typeof mouse.offsetX === 'number'
      ? { offset: { x: round(mouse.offsetX), y: round(mouse.offsetY) } }
      : {}),
    target: elementPath(event.target),
    ...(client ? { hit: elementPath(hitElement) } : {}),
    ...(targetControl ? { targetControl: describeElement(targetControl) } : {}),
    ...(hitControl ? { hitControl: describeElement(hitControl) } : {}),
    capturePrevented: event.defaultPrevented,
    reachedBubble: false,
    timeStamp: round(event.timeStamp),
    ...(displayMode ? { displayMode } : {}),
    viewport: { width: win.innerWidth, height: win.innerHeight, dpr: win.devicePixelRatio },
    ...(vv
      ? {
          visualViewport: {
            scale: vv.scale,
            ...rect({ x: vv.offsetLeft, y: vv.offsetTop, width: vv.width, height: vv.height }),
          },
        }
      : {}),
    documentRect: rect(doc.documentElement.getBoundingClientRect()),
    ...(dock ? { dockRect: rect(dock.getBoundingClientRect()) } : {}),
  };
}

export function createPointerLog(
  doc: Document,
  displayMode: () => string | undefined,
  send: (records: PointerLogRecord[], dropped: number) => void,
) {
  const win = doc.defaultView ?? window;
  const queue: PointerLogRecord[] = [];
  const records = new WeakMap<Event, PointerLogRecord>();
  let dropped = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let down: { at: number; element: Element | null; record: PointerLogRecord } | undefined;
  let downTimer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    timer = undefined;
    const batch = queue.splice(0, BATCH);
    if (batch.length) send(batch, dropped);
    dropped = 0;
    if (queue.length) timer = setTimeout(flush, FLUSH_MS);
  };
  const push = (record: PointerLogRecord) => {
    if (queue.length >= QUEUE_MAX) {
      dropped += 1;
      return;
    }
    queue.push(record);
    if (!timer) timer = setTimeout(flush, FLUSH_MS);
  };

  let lastMove = -Infinity;
  let hovered: Element | null | undefined;
  const wanted = (event: Event): boolean => {
    if (event.type === 'pointermove') {
      if (event.timeStamp - lastMove < MOVE_MS) return false;
      lastMove = event.timeStamp;
      return true;
    }
    if (event.type === 'pointerover' || event.type === 'pointerout') {
      const next = controlOf(
        event.type === 'pointerover' ? event.target : (event as PointerEvent).relatedTarget,
      );
      if (next === hovered) return false;
      hovered = next;
      return true;
    }
    return true;
  };

  const focusNote = () => {
    const active = doc.activeElement;
    return `visibility=${doc.visibilityState} hasFocus=${doc.hasFocus()} active=${
      active ? describeElement(active) : 'none'
    }`.slice(0, 200);
  };

  const onCapture = (event: Event) => {
    if (!wanted(event)) return;
    let record: PointerLogRecord;
    try {
      record = serializePointerEvent(event, doc, displayMode());
    } catch (error) {
      console.warn('[wmit-widget] pointer log', error);
      return;
    }
    if (event.type === 'blur' || event.type === 'focus' || event.type === 'visibilitychange') {
      record.note = focusNote();
    }
    records.set(event, record);
    const element = controlOf(event.target) ?? (event.target as Element | null);
    if (event.type === 'pointerdown') {
      if (downTimer) clearTimeout(downTimer);
      const pending = { at: event.timeStamp, element, record };
      down = pending;
      downTimer = setTimeout(() => {
        if (down !== pending) return;
        down = undefined;
        push({ ...pending.record, type: 'summary', note: 'pointerdown without click' });
      }, CLICK_WINDOW_MS);
    } else if (event.type === 'click' && down) {
      record.sinceDownMs = round(event.timeStamp - down.at);
      record.sameAsDown = down.element === element;
      if (record.sameAsDown && record.sinceDownMs <= CLICK_WINDOW_MS) {
        if (downTimer) clearTimeout(downTimer);
        down = undefined;
      }
    }
    push(record);
  };
  const onBubble = (event: Event) => {
    const record = records.get(event);
    if (!record) return;
    record.reachedBubble = true;
    record.defaultPrevented = event.defaultPrevented;
  };

  for (const type of EVENTS) {
    const passive = type === 'touchstart';
    win.addEventListener(type, onCapture, { capture: true, passive });
    win.addEventListener(type, onBubble, { passive });
  }
  doc.addEventListener('visibilitychange', onCapture, { capture: true });
  return () => {
    doc.removeEventListener('visibilitychange', onCapture, { capture: true });
    for (const type of EVENTS) {
      win.removeEventListener(type, onCapture, { capture: true });
      win.removeEventListener(type, onBubble);
    }
    if (timer) clearTimeout(timer);
    if (downTimer) clearTimeout(downTimer);
  };
}

export function installPointerLog(app: App, doc: Document, displayMode: () => string | undefined) {
  const send = (events: PointerLogRecord[], dropped: number) => {
    void app
      .callServerTool({
        name: TOOL_REPORT_POINTER_EVENTS,
        arguments: { events, ...(dropped ? { dropped } : {}) },
      })
      .catch((error: unknown) => console.warn('[wmit-widget] report_pointer_events', error));
  };
  const stop = createPointerLog(doc, displayMode, send);
  const stopAb = watchDockAb(doc, (applied) => {
    const html = doc.documentElement.getBoundingClientRect();
    send(
      [
        {
          type: 'dock-ab',
          target: 'document',
          capturePrevented: false,
          reachedBubble: false,
          timeStamp: Math.round(performance.now()),
          viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
          documentRect: rect(html),
          note: applied.join(', ').slice(0, 200),
        },
      ],
      0,
    );
  });
  return () => {
    stop();
    stopAb();
  };
}
