import { BEAM_M, GIRDER, GUIDEWAY_TOP, PIER } from '../../../../model';
import { SHADOW_PAINT } from '../palette';
import { prismShadow, shadowBand } from '../shadow';
import type { GroundPoint } from '../shadow';
import { fillBox, tracePolygon, wrapShifts } from './painter';
import type { Painter } from './painter';

const TRACE_STEP = 1.5;

export function guidewayShadowBand(): [number, number] {
  const half = GIRDER.topWidth / 2;
  return shadowBand([-half, half], [GIRDER.bottom, GUIDEWAY_TOP]);
}

export function pierShadow(x: number): GroundPoint[] {
  const halfWidth = PIER.width / 2;
  const halfDepth = PIER.depth / 2;
  return prismShadow({
    x: [x - halfWidth, x + halfWidth],
    y: [0, PIER.height],
    z: [-halfDepth, halfDepth],
  });
}

function pierShadows(painter: Painter): void {
  const { context } = painter;
  const count = Math.round(painter.period / BEAM_M);
  context.fillStyle = SHADOW_PAINT.tint;
  for (let index = 0; index < count; index += 1) {
    const outline = pierShadow(index * BEAM_M);
    const xs = outline.map(([x]) => x);
    wrapShifts(painter, [Math.min(...xs), Math.max(...xs)]).forEach((shift) => {
      tracePolygon(painter, outline, shift, TRACE_STEP);
      context.fill();
    });
  }
}

function shadowMask(painter: Painter): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(painter.width / SHADOW_PAINT.reduction);
  canvas.height = Math.round(painter.height / SHADOW_PAINT.reduction);
  const context = canvas.getContext('2d');
  if (!context) return null;
  const small: Painter = { ...painter, context, width: canvas.width, height: canvas.height };
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  fillBox(small, [0, painter.period], guidewayShadowBand(), SHADOW_PAINT.tint);
  pierShadows(small);
  return canvas;
}

export function paintShadows(painter: Painter): void {
  const mask = shadowMask(painter);
  if (!mask) return;
  const { context } = painter;
  context.save();
  context.globalCompositeOperation = 'multiply';
  context.globalAlpha = SHADOW_PAINT.strength;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(mask, 0, 0, painter.width, painter.height);
  context.restore();
}
