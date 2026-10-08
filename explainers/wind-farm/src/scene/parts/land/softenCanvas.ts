import type { Painter } from './groundCanvas';

export interface Softening {
  readonly reduction: number;
  readonly alpha: number;
}

export function softenCanvas(
  { context, projection }: Painter,
  { reduction, alpha }: Softening,
): void {
  const small = document.createElement('canvas');
  small.width = Math.round(projection.size / reduction);
  small.height = small.width;
  const drawing = small.getContext('2d');
  if (!drawing) return;
  drawing.imageSmoothingQuality = 'high';
  drawing.drawImage(context.canvas, 0, 0, small.width, small.height);
  context.save();
  context.globalAlpha = alpha;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(small, 0, 0, projection.size, projection.size);
  context.restore();
}
