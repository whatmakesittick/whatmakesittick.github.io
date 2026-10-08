import { Color } from 'three';
import { smoothstep } from '@core/math';
import type { GroundPoint } from '../../../model/layout';
import { GROUND_TEXTURE } from './constants';
import type { Bounds } from './fieldPlan';
import { cssColour } from './groundCanvas';
import type { Painter } from './groundCanvas';
import { hash2 } from './random';

const RGBA = 4;
const GREY = 128;
const OPAQUE = 255;
const HALF = 0.5;

function noiseCanvas(cells: number, amount: number, seed: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = cells;
  canvas.height = cells;
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  const image = context.createImageData(cells, cells);
  for (let index = 0; index < cells * cells; index += 1) {
    const value =
      GREY + (hash2(index % cells, Math.floor(index / cells), seed) - HALF) * amount * OPAQUE;
    image.data.fill(value, index * RGBA, index * RGBA + RGBA - 1);
    image.data[index * RGBA + RGBA - 1] = OPAQUE;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

export function paintMottle(painter: Painter): void {
  const { context, projection } = painter;
  context.save();
  context.globalCompositeOperation = 'soft-light';
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  GROUND_TEXTURE.mottle.forEach(({ cells, amount, seed }) =>
    context.drawImage(noiseCanvas(cells, amount, seed), 0, 0, projection.size, projection.size),
  );
  context.restore();
}

function fadeStops(
  gradient: CanvasGradient,
  colour: Color,
  offsets: (share: number) => number,
): void {
  const { fadeStops: stops } = GROUND_TEXTURE;
  for (let stop = 0; stop <= stops; stop += 1) {
    const share = stop / stops;
    gradient.addColorStop(offsets(share), cssColour(colour, 1 - smoothstep(share, 0, 1)));
  }
}

export function fadeBoxEdges(painter: Painter, bounds: Bounds, fade: number, tone: string): void {
  const { context, projection } = painter;
  const colour = new Color(tone);
  const [middleX, middleZ] = [(bounds.minX + bounds.maxX) / 2, (bounds.minZ + bounds.maxZ) / 2];
  const sides: readonly [GroundPoint, GroundPoint][] = [
    [
      [bounds.minX, middleZ],
      [bounds.minX + fade, middleZ],
    ],
    [
      [bounds.maxX, middleZ],
      [bounds.maxX - fade, middleZ],
    ],
    [
      [middleX, bounds.minZ],
      [middleX, bounds.minZ + fade],
    ],
    [
      [middleX, bounds.maxZ],
      [middleX, bounds.maxZ - fade],
    ],
  ];
  sides.forEach(([edge, inner]) => {
    const [from, to] = [projection.pixel(...edge), projection.pixel(...inner)];
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const gradient = context.createLinearGradient(...from, ...to);
    fadeStops(gradient, colour, (share) => {
      const [x, y] = projection.pixel(
        edge[0] + (inner[0] - edge[0]) * share,
        edge[1] + (inner[1] - edge[1]) * share,
      );
      return Math.hypot(x - from[0], y - from[1]) / length;
    });
    context.fillStyle = gradient;
    context.fillRect(0, 0, projection.size, projection.size);
  });
}

export function radialGradient(
  painter: Painter,
  [inner, outer]: readonly [number, number],
  stop: (share: number) => string,
): CanvasGradient {
  const { context, projection } = painter;
  const centre = projection.pixel(0, 0);
  const radius = (distance: number) => projection.pixel(distance, 0)[0] - centre[0];
  const gradient = context.createRadialGradient(...centre, radius(inner), ...centre, radius(outer));
  const { fadeStops: stops } = GROUND_TEXTURE;
  for (let index = 0; index <= stops; index += 1) {
    const share = index / stops;
    const distance = inner + (outer - inner) * share;
    const offset = (radius(distance) - radius(inner)) / (radius(outer) - radius(inner));
    gradient.addColorStop(offset, stop(smoothstep(share, 0, 1)));
  }
  return gradient;
}

export function radialPaint(
  painter: Painter,
  range: readonly [number, number],
  stop: (share: number) => string,
): void {
  const { context, projection } = painter;
  context.fillStyle = radialGradient(painter, range, stop);
  context.fillRect(0, 0, projection.size, projection.size);
}
