import { MAX_PIXEL_RATIO } from '@core/scene/constants';

export interface CanvasFrame {
  width: number;
  height: number;
  ratio: number;
  fontFamily: string;
}

export type Painter = (context: CanvasRenderingContext2D, frame: CanvasFrame) => void;

export interface CanvasSurfaceOptions {
  onFontsReady?(): void;
}

const FALLBACK_FONT_FAMILY = 'system-ui, sans-serif';
const VISIBILITY_MARGIN = '200px';

export function canvasFont(frame: CanvasFrame, sizePx: number): string {
  return `${sizePx}px ${frame.fontFamily}`;
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

function resolutionQuery(): MediaQueryList {
  return window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
}

function watchPixelRatio(onChange: () => void): () => void {
  let query = resolutionQuery();
  const handle = () => {
    query.removeEventListener('change', handle);
    query = resolutionQuery();
    query.addEventListener('change', handle);
    onChange();
  };
  query.addEventListener('change', handle);
  return () => query.removeEventListener('change', handle);
}

export class CanvasSurface {
  private readonly canvas: HTMLCanvasElement;
  private readonly aspect: number;
  private readonly resizeObserver: ResizeObserver;
  private readonly visibilityObserver: IntersectionObserver;
  private readonly stopWatchingPixelRatio: () => void;
  private width: number;
  private painter: Painter | null = null;
  private onScreen = false;
  private stale = false;

  constructor(canvas: HTMLCanvasElement, options: CanvasSurfaceOptions = {}) {
    this.canvas = canvas;
    this.aspect = canvas.height / canvas.width;
    this.width = canvas.clientWidth || canvas.width;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.visibilityObserver = new IntersectionObserver((entries) => this.updateOnScreen(entries), {
      rootMargin: VISIBILITY_MARGIN,
    });
    this.visibilityObserver.observe(canvas);
    this.stopWatchingPixelRatio = watchPixelRatio(() => this.requestRender());
    whenFontsReady(() => {
      options.onFontsReady?.();
      this.requestRender();
    });
  }

  paint(painter: Painter): void {
    this.painter = painter;
    this.requestRender();
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.visibilityObserver.disconnect();
    this.stopWatchingPixelRatio();
  }

  private updateOnScreen(entries: readonly IntersectionObserverEntry[]): void {
    this.onScreen = entries.at(-1)?.isIntersecting ?? this.onScreen;
    if (this.onScreen && this.stale) this.render();
  }

  private resize(): void {
    const width = this.canvas.clientWidth;
    if (width === 0 || width === this.width) return;
    this.width = width;
    this.requestRender();
  }

  private requestRender(): void {
    this.stale = true;
    if (this.onScreen) this.render();
  }

  private frame(): CanvasFrame {
    return {
      width: this.width,
      height: this.width * this.aspect,
      ratio: pixelRatio(),
      fontFamily: getComputedStyle(this.canvas).fontFamily || FALLBACK_FONT_FAMILY,
    };
  }

  private render(): void {
    const context = this.canvas.getContext('2d');
    if (!context || !this.painter) return;
    this.stale = false;
    const frame = this.frame();
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
