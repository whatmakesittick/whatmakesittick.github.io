import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

export type Painter = (context: CanvasRenderingContext2D, width: number, height: number) => void;

const ANISOTROPY = 8;

export function canvasTexture(width: number, height: number, paint: Painter): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context) paint(context, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

export function repaint(texture: CanvasTexture, paint: Painter): void {
  const canvas = texture.image as HTMLCanvasElement;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  paint(context, canvas.width, canvas.height);
  texture.needsUpdate = true;
}

export function repeating(texture: CanvasTexture, repeatX: number, repeatY: number): CanvasTexture {
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}
