import { CanvasTexture, SRGBColorSpace } from 'three';
import type { PartContext } from './context';

export type Painter = (paint: CanvasRenderingContext2D, width: number, height: number) => void;

export const PRINT_FONT = '600 {size}px Inter, "Helvetica Neue", Arial, sans-serif';

export function font(size: number): string {
  return PRINT_FONT.replace('{size}', String(Math.round(size)));
}

export function canvasTexture(
  context: PartContext,
  width: number,
  height: number,
  painter: Painter,
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const paint = canvas.getContext('2d');
  if (paint) painter(paint, width, height);
  const texture = context.tracker.track(new CanvasTexture(canvas));
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
