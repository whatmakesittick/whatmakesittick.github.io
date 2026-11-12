import { CanvasTexture, SRGBColorSpace } from 'three';
import type { PartContext } from '../context';

const EQUIRECTANGULAR_REFLECTION = 303 as CanvasTexture['mapping'];
const WIDTH = 256;
const HEIGHT = 128;
const HORIZON = HEIGHT / 2;
const CEILING_STOPS = [
  [0, '#eef2f7'],
  [1, '#8a96a4'],
] as const;
const FLOOR_STOPS = [
  [0, '#8795a4'],
  [1, '#36404a'],
] as const;
const BAND_COLOR = '#6a86a8';
const BAND_HEIGHT = 18;
const STRIP_COLOR = '#ffffff';
const STRIP_COUNT = 6;
const STRIP_WIDTH = 38;
const STRIP_HEIGHT = 10;
const STRIP_ROWS = [12, 30] as const;

function fillGradient(
  g: CanvasRenderingContext2D,
  top: number,
  height: number,
  stops: readonly (readonly [number, string])[],
): void {
  const gradient = g.createLinearGradient(0, top, 0, top + height);
  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
  g.fillStyle = gradient;
  g.fillRect(0, top, WIDTH, height);
}

function drawStrips(g: CanvasRenderingContext2D): void {
  g.fillStyle = STRIP_COLOR;
  STRIP_ROWS.forEach((row, rowIndex) => {
    for (let index = 0; index < STRIP_COUNT; index += 1) {
      const x = ((index + rowIndex / 2) / STRIP_COUNT) * WIDTH;
      g.fillRect(x, row, STRIP_WIDTH, STRIP_HEIGHT);
    }
  });
}

export function workshopEnvironment(context: PartContext): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const g = canvas.getContext('2d');
  if (g) {
    fillGradient(g, 0, HORIZON, CEILING_STOPS);
    fillGradient(g, HORIZON, HEIGHT - HORIZON, FLOOR_STOPS);
    drawStrips(g);
    g.fillStyle = BAND_COLOR;
    g.fillRect(0, HORIZON - BAND_HEIGHT / 2, WIDTH, BAND_HEIGHT);
  }
  const texture = context.tracker.track(new CanvasTexture(canvas));
  texture.mapping = EQUIRECTANGULAR_REFLECTION;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
