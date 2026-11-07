import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

export type CanvasPaint = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) => void;

export type CanvasLook = Partial<Pick<CanvasTexture, 'colorSpace' | 'wrapT' | 'anisotropy'>>;

export function canvasTexture(
  width: number,
  height: number,
  paint: CanvasPaint,
  look: CanvasLook = {},
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context) paint(context, width, height);
  return Object.assign(
    new CanvasTexture(canvas),
    { colorSpace: SRGBColorSpace, wrapS: RepeatWrapping },
    look,
  );
}
