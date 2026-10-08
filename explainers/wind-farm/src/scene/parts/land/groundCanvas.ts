import { Color, SRGBColorSpace } from 'three';
import type { GroundPoint } from '../../../model/layout';
import { GROUND_TEXTURE } from './constants';
import { pointAlong } from './polygon';
import type { Projection } from './projection';

export interface Painter {
  readonly context: CanvasRenderingContext2D;
  readonly projection: Projection;
}

const CHANNEL = 255;
const HALF = 0.5;
const rgb = { r: 0, g: 0, b: 0 };

export function cssColour(colour: Color, alpha = 1): string {
  const { r, g, b } = colour.getRGB(rgb, SRGBColorSpace);
  const [red, green, blue] = [r, g, b].map((value) => Math.round(Math.min(1, value) * CHANNEL));
  return `rgba(${red},${green},${blue},${alpha})`;
}

export function shaded(colour: string | Color, factor: number): Color {
  return new Color(colour).multiplyScalar(factor);
}

export function traceLine(painter: Painter, points: readonly GroundPoint[], closed = false): void {
  const { context, projection } = painter;
  const ring = closed ? [...points, points[0]] : points;
  context.moveTo(...projection.pixel(...ring[0]));
  for (let index = 1; index < ring.length; index += 1) {
    const [fromX, fromZ] = ring[index - 1];
    const [toX, toZ] = ring[index];
    const steps = Math.max(1, Math.ceil(Math.hypot(toX - fromX, toZ - fromZ) / projection.step));
    for (let step = 1; step <= steps; step += 1) {
      const share = step / steps;
      context.lineTo(
        ...projection.pixel(fromX + (toX - fromX) * share, fromZ + (toZ - fromZ) * share),
      );
    }
  }
}

export function tracePolygon(painter: Painter, points: readonly GroundPoint[]): void {
  painter.context.beginPath();
  traceLine(painter, points, true);
  painter.context.closePath();
}

export function lineWidth(painter: Painter, [x, z]: GroundPoint, metres: number): number {
  return Math.max(GROUND_TEXTURE.minLinePx, metres * painter.projection.scale(x, z));
}

export function strokePath(
  painter: Painter,
  points: readonly GroundPoint[],
  metres: number,
  style: string,
): void {
  const { context } = painter;
  context.strokeStyle = style;
  context.lineCap = 'round';
  for (let index = 1; index < points.length; index += 1) {
    const [from, to] = [points[index - 1], points[index]];
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const pieces = Math.max(1, Math.ceil(length / GROUND_TEXTURE.strokePiece));
    for (let piece = 0; piece < pieces; piece += 1) {
      const [start, end] = [piece / pieces, (piece + 1) / pieces].map((share) =>
        pointAlong(from, to, share),
      );
      context.beginPath();
      traceLine(painter, [start, end]);
      context.lineWidth = lineWidth(painter, pointAlong(start, end, HALF), metres);
      context.stroke();
    }
  }
}

export function rotatedRectangle(
  centre: GroundPoint,
  angle: number,
  [length, width]: readonly [number, number],
  [offsetAlong, offsetAcross]: readonly [number, number] = [0, 0],
): GroundPoint[] {
  const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
  const corner = (along: number, across: number): GroundPoint => [
    centre[0] + (offsetAlong + along) * cos - (offsetAcross + across) * sin,
    centre[1] + (offsetAlong + along) * sin + (offsetAcross + across) * cos,
  ];
  const [a, b] = [length / 2, width / 2];
  return [corner(-a, -b), corner(a, -b), corner(a, b), corner(-a, b)];
}
