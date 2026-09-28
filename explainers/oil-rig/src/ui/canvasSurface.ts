import { MAX_PIXEL_RATIO } from '@core/scene/constants';

export interface CanvasFrame {
  width: number;
  height: number;
  ratio: number;
}

export type Painter = (context: CanvasRenderingContext2D, frame: CanvasFrame) => void;

export interface CanvasSurfaceOptions {
  onFontsReady?(): void;
}

export const CANVAS_FONT_FAMILY = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";

export function canvasFont(sizePx: number): string {
  return `${sizePx}px ${CANVAS_FONT_FAMILY}`;
}

export function widestText(context: CanvasRenderingContext2D, texts: readonly string[]): number {
  return Math.max(...texts.map((text) => context.measureText(text).width));
}

function whenFontsReady(callback: () => void): void {
  if ('fonts' in document) void document.fonts.ready.then(callback);
}

function pixelRatio(): number {
  return Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
}

export class CanvasSurface {
  private readonly canvas: HTMLCanvasElement;
  private readonly aspect: number;
  private readonly observer: ResizeObserver;
  private width: number;
  private painter: Painter | null = null;

  constructor(canvas: HTMLCanvasElement, options: CanvasSurfaceOptions = {}) {
    this.canvas = canvas;
    this.aspect = canvas.height / canvas.width;
    this.width = canvas.clientWidth || canvas.width;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    whenFontsReady(() => {
      options.onFontsReady?.();
      this.render();
    });
  }

  paint(painter: Painter): void {
    this.painter = painter;
    this.render();
  }

  dispose(): void {
    this.observer.disconnect();
  }

  private resize(): void {
    const width = this.canvas.clientWidth;
    if (width === 0 || width === this.width) return;
    this.width = width;
    this.render();
  }

  private render(): void {
    const context = this.canvas.getContext('2d');
    if (!context || !this.painter) return;
    const frame = { width: this.width, height: this.width * this.aspect, ratio: pixelRatio() };
    this.fitBacking(frame);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.setTransform(frame.ratio, 0, 0, frame.ratio, 0, 0);
    this.painter(context, frame);
  }

  private fitBacking({ width, height, ratio }: CanvasFrame): void {
    const backingWidth = Math.round(width * ratio);
    const backingHeight = Math.round(height * ratio);
    if (this.canvas.width !== backingWidth) this.canvas.width = backingWidth;
    if (this.canvas.height !== backingHeight) this.canvas.height = backingHeight;
  }
}
