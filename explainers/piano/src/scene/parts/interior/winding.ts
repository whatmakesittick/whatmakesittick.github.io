import { RepeatWrapping } from 'three';
import type { Texture } from 'three';
import { canvasTexture } from '../canvasTexture';
import type { PartContext } from '../context';
import { WINDING } from './constants';

const STRIPES = { count: 8, rowsEach: 8, width: 4, light: '#ffffff', dark: '#5a5a5a' } as const;

export const WINDING_TILE = STRIPES.count * WINDING.pitch;

function paintStripes(context: CanvasRenderingContext2D, width: number, height: number): void {
  const row = height / STRIPES.count;
  for (let stripe = 0; stripe < STRIPES.count; stripe += 1) {
    const gradient = context.createLinearGradient(0, stripe * row, 0, (stripe + 1) * row);
    gradient.addColorStop(0, STRIPES.dark);
    gradient.addColorStop(1 / 2, STRIPES.light);
    gradient.addColorStop(1, STRIPES.dark);
    context.fillStyle = gradient;
    context.fillRect(0, stripe * row, width, row);
  }
}

export function windingTexture(context: PartContext, tilesAlong: number): Texture {
  const texture = canvasTexture(STRIPES.width, STRIPES.count * STRIPES.rowsEach, paintStripes, {
    wrapT: RepeatWrapping,
  });
  texture.repeat.set(1, tilesAlong);
  return context.tracker.track(texture);
}
