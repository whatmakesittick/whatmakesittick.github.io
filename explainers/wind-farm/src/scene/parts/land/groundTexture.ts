import { CanvasTexture, SRGBColorSpace } from 'three';
import type { PartContext } from '../context';
import { GROUND_TEXTURE } from './constants';
import type { Painter } from './groundCanvas';
import type { Projection } from './projection';

export function groundTexture(
  context: PartContext,
  projection: Projection,
  paint: (painter: Painter) => void,
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = projection.size;
  canvas.height = projection.size;
  const drawing = canvas.getContext('2d');
  if (drawing) paint({ context: drawing, projection });
  const texture = context.tracker.track(new CanvasTexture(canvas));
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = GROUND_TEXTURE.anisotropy;
  return texture;
}
