import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initI18n, setLanguage } from '../i18n';
import { CanvasSurface } from './canvasSurface';
import type { CanvasFrame } from './canvasSurface';

const CANVAS_WIDTH = 320;
const RESIZED_WIDTH = 240;

class VisibleObserver {
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element): void {
    const entry = { isIntersecting: true, target } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }

  disconnect(): void {}
}

class ManualResizeObserver {
  static latest: ManualResizeObserver | undefined;
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ManualResizeObserver.latest = this;
  }

  observe(): void {}

  disconnect(): void {}

  resize(): void {
    this.callback([], this as unknown as ResizeObserver);
  }
}

function canvasOfWidth(width: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = width / 2;
  const context = { setTransform: vi.fn(), clearRect: vi.fn() };
  vi.spyOn(canvas, 'getContext').mockReturnValue(context as unknown as RenderingContext);
  return canvas;
}

describe('canvas surface', () => {
  let canvas: HTMLCanvasElement;
  let surface: CanvasSurface;
  let computedStyle: ReturnType<typeof vi.spyOn>;
  const frames: CanvasFrame[] = [];
  const painter = (_context: CanvasRenderingContext2D, frame: CanvasFrame) => frames.push(frame);

  beforeAll(() => initI18n({ en: () => Promise.resolve({}), de: () => Promise.resolve({}) }));

  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', VisibleObserver);
    vi.stubGlobal('ResizeObserver', ManualResizeObserver);
    computedStyle = vi.spyOn(window, 'getComputedStyle');
    frames.length = 0;
    canvas = canvasOfWidth(CANVAS_WIDTH);
    surface = new CanvasSurface(canvas);
  });

  afterEach(() => {
    surface.dispose();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reads the canvas font once for any number of frames', () => {
    surface.paint(painter);
    surface.paint(painter);
    surface.paint(painter);
    expect(frames).toHaveLength(3);
    expect(computedStyle).toHaveBeenCalledTimes(1);
    expect(frames[0].fontFamily).not.toBe('');
  });

  it('reads the font again after a resize', () => {
    surface.paint(painter);
    Object.defineProperty(canvas, 'clientWidth', { value: RESIZED_WIDTH, configurable: true });
    ManualResizeObserver.latest?.resize();
    expect(frames.at(-1)?.width).toBe(RESIZED_WIDTH);
    expect(computedStyle).toHaveBeenCalledTimes(2);
  });

  it('reads the font again after the language changes', async () => {
    surface.paint(painter);
    await setLanguage('de');
    surface.paint(painter);
    expect(computedStyle).toHaveBeenCalledTimes(2);
  });
});
