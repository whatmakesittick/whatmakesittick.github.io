import type { CanvasFrame, Painter } from '@core/ui/canvasSurface';

const KEY_SEPARATOR = '|';

export function layerKey(frame: CanvasFrame, labels: readonly string[]): string {
  return [frame.width, frame.height, frame.ratio, frame.fontFamily, ...labels].join(KEY_SEPARATOR);
}

export class CachedLayer {
  private readonly canvas = document.createElement('canvas');
  private key = '';

  invalidate(): void {
    this.key = '';
  }

  draw(context: CanvasRenderingContext2D, frame: CanvasFrame, key: string, paint: Painter): void {
    if (key !== this.key) this.render(frame, key, paint);
    context.drawImage(this.canvas, 0, 0, frame.width, frame.height);
  }

  private render(frame: CanvasFrame, key: string, paint: Painter): void {
    this.canvas.width = Math.round(frame.width * frame.ratio);
    this.canvas.height = Math.round(frame.height * frame.ratio);
    const context = this.canvas.getContext('2d');
    if (!context) return;
    context.setTransform(frame.ratio, 0, 0, frame.ratio, 0, 0);
    paint(context, frame);
    this.key = key;
  }
}
