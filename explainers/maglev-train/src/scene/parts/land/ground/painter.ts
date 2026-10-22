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

export function pixelX(painter: Painter, x: number): number {
  return (x / painter.period) * painter.width;
}

export function pixelY(painter: Painter, z: number): number {
  return (1 - painter.warp.share(z)) * painter.height;
}

export function alongXPixels(painter: Painter, metres: number): number {
  return (metres / painter.period) * painter.width;
}

export function acrossZPixels(painter: Painter, z: number, metres: number): number {
  return metres * painter.warp.density(z) * painter.height;
}

export function wrapShifts(painter: Painter, [from, to]: Range): number[] {
  return WRAPS.map((turn) => turn * painter.period).filter(
    (shift) => to + shift > 0 && from + shift < painter.period,
  );
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
