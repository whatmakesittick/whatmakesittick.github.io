import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createPointerLog,
  elementPath,
  serializePointerEvent,
  type PointerLogRecord,
} from '../../widget/src/pointerLog.ts';

function dockMarkup(): HTMLButtonElement {
  document.body.innerHTML =
    '<div class="wmit is-fs"><div class="dock-slot"><div class="dock" id="d">' +
    '<button class="play big" type="button"><svg class="icon"><path></path></svg></button>' +
    '</div></div></div>';
  return document.querySelector('button')!;
}

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('pointer log', () => {
  it('describes an element and up to six ancestors', () => {
    const button = dockMarkup();
    const path = button.querySelector('path')!;
    expect(elementPath(path)).toBe(
      'path < svg.icon < button.play.big < div#d.dock < div.dock-slot < div.wmit.is-fs < body',
    );
    expect(elementPath(null)).toBe('none');
  });

  it('serializes a pointer event with its control, viewport and document rect', () => {
    const button = dockMarkup();
    const svg = button.querySelector('svg')!;
    const event = new MouseEvent('click', { clientX: 10, clientY: 20, button: 0, bubbles: true });
    svg.dispatchEvent(event);
    const record = serializePointerEvent(event, document, 'fullscreen');
    expect(record).toMatchObject({
      type: 'click',
      button: 0,
      client: { x: 10, y: 20 },
      target: expect.stringMatching(/^svg\.icon < button\.play\.big/),
      targetControl: 'button.play.big',
      capturePrevented: false,
      reachedBubble: false,
      displayMode: 'fullscreen',
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    });
    expect(record.documentRect).toEqual(expect.objectContaining({ width: expect.any(Number) }));
    expect(record.dockRect).toBeDefined();
    expect(JSON.parse(JSON.stringify(record))).toEqual(record);
  });

  it('batches events, records the bubble outcome and flags a pointerdown without click', () => {
    vi.useFakeTimers();
    const button = dockMarkup();
    const batches: PointerLogRecord[][] = [];
    const stop = createPointerLog(
      document,
      () => 'fullscreen',
      (records) => batches.push(records),
    );
    button.addEventListener('mousedown', (e) => e.preventDefault());
    button.querySelector('svg')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    vi.advanceTimersByTime(1000);
    stop();
    const all = batches.flat();
    expect(all.map((r) => r.type)).toEqual(['pointerdown', 'mousedown', 'summary']);
    expect(all[1]).toMatchObject({ reachedBubble: true, defaultPrevented: true });
    expect(all[2]!.note).toBe('pointerdown without click');
  });

  it('marks a click that follows the pointerdown on the same control', () => {
    vi.useFakeTimers();
    const button = dockMarkup();
    const batches: PointerLogRecord[][] = [];
    const stop = createPointerLog(
      document,
      () => undefined,
      (records) => batches.push(records),
    );
    button.querySelector('svg')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.advanceTimersByTime(1000);
    stop();
    const all = batches.flat();
    expect(all.map((r) => r.type)).toEqual(['pointerdown', 'click']);
    expect(all[1]).toMatchObject({ sameAsDown: true });
  });
});
