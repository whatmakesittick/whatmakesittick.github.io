import { CanvasTexture, SRGBColorSpace } from 'three';
import type { SpinDirection } from '../../ids';

export interface ArrowLayout {
  size: number;
  radius: number;
  stroke: number;
  sweep: number;
  head: number;
  font: number;
}

const START_ANGLE = -Math.PI / 2;
const HEAD_WIDTH_SHARE = 0.7;
const INK = '#ffffff';

function arrowHead(
  context: CanvasRenderingContext2D,
  layout: ArrowLayout,
  angle: number,
  forward: 1 | -1,
): void {
  const half = layout.size / 2;
  const tip = [half + layout.radius * Math.cos(angle), half + layout.radius * Math.sin(angle)];
  const tangent = [-Math.sin(angle) * forward, Math.cos(angle) * forward];
  const radial = [Math.cos(angle), Math.sin(angle)];
  const width = layout.head * HEAD_WIDTH_SHARE;
  context.beginPath();
  context.moveTo(tip[0] + tangent[0] * layout.head, tip[1] + tangent[1] * layout.head);
  context.lineTo(tip[0] + radial[0] * width, tip[1] + radial[1] * width);
  context.lineTo(tip[0] - radial[0] * width, tip[1] - radial[1] * width);
  context.closePath();
  context.fill();
}

export function drawSpinArrow(
  context: CanvasRenderingContext2D,
  layout: ArrowLayout,
  direction: SpinDirection,
  label: string,
): void {
  const half = layout.size / 2;
  const forward = direction === 'clockwise' ? 1 : -1;
  const end = START_ANGLE + forward * layout.sweep;
  context.clearRect(0, 0, layout.size, layout.size);
  context.strokeStyle = INK;
  context.fillStyle = INK;
  context.lineWidth = layout.stroke;
  context.lineCap = 'round';
  context.beginPath();
  context.arc(half, half, layout.radius, START_ANGLE, end, direction !== 'clockwise');
  context.stroke();
  arrowHead(context, layout, end, forward);
  context.font = `bold ${layout.font}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, half, half);
}

export function spinArrowTexture(
  layout: ArrowLayout,
  direction: SpinDirection,
  label: string,
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = layout.size;
  canvas.height = layout.size;
  const context = canvas.getContext('2d');
  if (context) drawSpinArrow(context, layout, direction, label);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
