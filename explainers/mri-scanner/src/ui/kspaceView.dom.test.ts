import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { initI18n } from '@core/i18n';
import { CanvasSurface } from '@core/ui/canvasSurface';
import type { CanvasFrame, Painter } from '@core/ui/canvasSurface';
import chapters from '../../chapters.html?raw';
import en from '../../locales/en.json';
import { MODEL_SIZE } from '../model';
import { createMriScannerStore } from '../state';
import type { MriScannerStore } from '../state';
import { mountKspaceView } from './kspaceView';

const FRAME: CanvasFrame = { width: 256, height: 256, ratio: 1, fontFamily: 'sans-serif' };

function fakeContext() {
  return { fillRect: vi.fn(), fillText: vi.fn() };
}

function paintWith(painter: Painter | undefined) {
  const context = fakeContext();
  painter?.(context as unknown as CanvasRenderingContext2D, FRAME);
  return context;
}

describe('k-space and image canvases', () => {
  let store: MriScannerStore;
  let dispose: () => void;
  let paint: MockInstance<CanvasSurface['paint']>;

  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  beforeEach(() => {
    document.body.innerHTML = chapters;
    paint = vi.spyOn(CanvasSurface.prototype, 'paint');
    store = createMriScannerStore({ playing: false, linesFilled: 0 });
    dispose = mountKspaceView(document, store);
  });

  afterEach(() => {
    dispose();
    paint.mockRestore();
  });

  function lastPainters(): Painter[] {
    return paint.mock.calls.slice(-2).map(([painter]) => painter);
  }

  it('makes both canvases square', () => {
    document.querySelectorAll('canvas').forEach((canvas) => {
      expect(canvas.width).toBe(canvas.height);
    });
  });

  it('shows the empty hint on the image before the first line', () => {
    expect(paint).toHaveBeenCalledTimes(2);
    const [, image] = lastPainters();
    expect(paintWith(image).fillText).toHaveBeenCalledWith(
      en.chapters.picture.empty,
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('draws k-space and the image once lines arrive', () => {
    store.getState().setLinesFilled(16);
    expect(paint).toHaveBeenCalledTimes(4);
    const [kspace, image] = lastPainters();
    expect(paintWith(kspace).fillRect.mock.calls.length).toBeGreaterThan(1);
    const drawn = paintWith(image);
    expect(drawn.fillText).not.toHaveBeenCalled();
    expect(drawn.fillRect.mock.calls.length).toBeGreaterThan(1);
  });

  function labelOf(name: string): string | null {
    return document.querySelector(`[data-canvas="${name}"]`)?.getAttribute('aria-label') ?? null;
  }

  it('describes both canvases as images with the empty text before the first line', () => {
    document.querySelectorAll('canvas[data-canvas]').forEach((canvas) => {
      expect(canvas.getAttribute('role')).toBe('img');
    });
    expect(labelOf('kspace')).toBe(en.chapters.picture.empty);
    expect(labelOf('image')).toBe(en.chapters.picture.empty);
  });

  it('counts the filled lines in both canvas labels', () => {
    store.getState().setLinesFilled(16);
    const filled = (template: string) =>
      template.replace('{{lines}}', '16').replace('{{total}}', String(MODEL_SIZE));
    expect(labelOf('kspace')).toBe(filled(en.chapters.picture.kspaceAlt));
    expect(labelOf('image')).toBe(filled(en.chapters.picture.imageAlt));
  });

  it('redraws only when the field, the weighting or the lines change', () => {
    store.getState().setTipAngle(45);
    store.getState().setTissue('fat');
    expect(paint).toHaveBeenCalledTimes(2);
    store.getState().setField('field30');
    expect(paint).toHaveBeenCalledTimes(4);
  });
});
