import type { Range } from '../random';
import type { AxisWarp } from './warp';

export interface Painter {
  readonly context: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
  readonly period: number;
  readonly warp: AxisWarp;
}

const WRAPS = [-1, 0, 1] as const;
const SMOOTH = { imageSmoothingEnabled: true, imageSmoothingQuality: 'high' } as const;

export type Blend = Partial<
  Pick<CanvasRenderingContext2D, 'globalAlpha' | 'globalCompositeOperation'>
>;

export function pixelX(painter: Painter, x: number): number {
  return (x / painter.period) * painter.width;
}

export function pixelY(painter: Painter, z: number): number {
  return (1 - painter.warp.share(z)) * painter.height;
}

export function acrossZPixels(painter: Painter, z: number, metres: number): number {
  return metres * painter.warp.density(z) * painter.height;
}

export function wrapShifts(painter: Painter, [from, to]: Range): number[] {
  return WRAPS.map((turn) => turn * painter.period).filter(
    (shift) => to + shift > 0 && from + shift < painter.period,
  );
}

export interface Area {
  readonly x: Range;
  readonly z: Range;
}

export function fillArea(painter: Painter, area: Area, style: string | CanvasGradient): void {
  fillBox(painter, area.x, area.z, style);
}

export function linearGradient(painter: Painter, inZ: boolean, [from, to]: Range): CanvasGradient {
  const { context } = painter;
  return inZ
    ? context.createLinearGradient(0, pixelY(painter, to), 0, pixelY(painter, from))
    : context.createLinearGradient(pixelX(painter, from), 0, pixelX(painter, to), 0);
}

export function fillBox(
  painter: Painter,
  x: Range,
  z: Range,
  style: string | CanvasGradient | CanvasPattern,
): void {
  const { context } = painter;
  const top = pixelY(painter, z[1]);
  const bottom = pixelY(painter, z[0]);
  context.fillStyle = style;
  wrapShifts(painter, x).forEach((shift) => {
    const left = pixelX(painter, x[0] + shift);
    context.fillRect(left, top, pixelX(painter, x[1] + shift) - left, bottom - top);
  });
}

export function tracePolygon(
  painter: Painter,
  points: readonly (readonly [number, number])[],
  shift: number,
  step: number,
): void {
  const { context } = painter;
  context.beginPath();
  points.forEach(([x, z], index) => {
    const [nextX, nextZ] = points[(index + 1) % points.length];
    const pieces = Math.max(1, Math.ceil(Math.abs(nextZ - z) / step));
    if (index === 0) context.moveTo(pixelX(painter, x + shift), pixelY(painter, z));
    for (let piece = 1; piece <= pieces; piece += 1) {
      const share = piece / pieces;
      const atX = x + (nextX - x) * share + shift;
      context.lineTo(pixelX(painter, atX), pixelY(painter, z + (nextZ - z) * share));
    }
  });
  context.closePath();
}

export function drawSmooth(
  painter: Painter,
  [width, height]: readonly [number, number],
  paint: (context: CanvasRenderingContext2D) => void,
  blend: Blend,
  [left, drawnWidth]: Range = [0, painter.width],
): void {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const scratch = canvas.getContext('2d');
  if (!scratch) return;
  paint(scratch);
  const { context } = painter;
  context.save();
  Object.assign(context, SMOOTH, blend);
  context.drawImage(canvas, left, 0, drawnWidth, painter.height);
  context.restore();
}
