import type { CanvasTexture } from 'three';
import type { LayoutId } from '../../../ids';
import { LAYOUTS, MODULE } from '../../../model';
import { BUSBARS } from '../../constants';
import { PAINT } from '../../finishes';
import { GRID, LAMINATE, cellHeight, cellRects } from '../../geometry/moduleLayout';
import { canvasTexture } from '../canvas';
import type { Painter } from '../canvas';

const CELL_TEXTURE_WIDTH = 256;
const FINGERS_PER_CELL_HEIGHT_CM = 2.4;
const FINGER_LINE = 1;
const SHEEN = { top: 'rgba(90, 120, 200, 0.10)', bottom: 'rgba(0, 0, 0, 0.18)' } as const;
const MODULE_TEXTURE_HEIGHT = 1024;
const BUSBAR_LINE = 1;
const BUSBAR_TINT = 'rgba(213, 217, 222, 0.5)';
const RIBBON = { margin: 0.6, width: 0.4 } as const;

function paintBusbars(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  count: number,
): void {
  context.fillStyle = BUSBAR_TINT;
  for (let bar = 0; bar < count; bar += 1) {
    context.fillRect(((bar + 1 / 2) / count) * width, 0, BUSBAR_LINE, height);
  }
}

function paintCellFace(fingers: number, busbars: number): Painter {
  return (context, width, height) => {
    context.fillStyle = PAINT.cell;
    context.fillRect(0, 0, width, height);
    const sheen = context.createLinearGradient(0, 0, width, height);
    sheen.addColorStop(0, SHEEN.top);
    sheen.addColorStop(1, SHEEN.bottom);
    context.fillStyle = sheen;
    context.fillRect(0, 0, width, height);
    context.fillStyle = PAINT.fingerLine;
    for (let index = 0; index < fingers; index += 1) {
      const y = ((index + 0.5) / fingers) * height;
      context.fillRect(0, y, width, FINGER_LINE);
    }
    paintBusbars(context, width, height, busbars);
  };
}

export function cellFaceTexture(
  layout: LayoutId,
  cellHeightCm: number,
  cellWidthCm: number,
): CanvasTexture {
  const height = Math.round((CELL_TEXTURE_WIDTH * cellHeightCm) / cellWidthCm);
  const fingers = Math.round(cellHeightCm * FINGERS_PER_CELL_HEIGHT_CM);
  const texture = canvasTexture(
    CELL_TEXTURE_WIDTH,
    height,
    paintCellFace(fingers, BUSBARS[layout].count),
  );
  texture.name = `cell-${layout}`;
  return texture;
}

function paintModuleFace(context: CanvasRenderingContext2D, width: number, height: number): void {
  const scaleX = width / LAMINATE.width;
  const scaleY = height / LAMINATE.height;
  const toX = (x: number) => (x + LAMINATE.width / 2) * scaleX;
  const toY = (y: number) => (MODULE.height - (MODULE.height - LAMINATE.height) / 2 - y) * scaleY;
  context.fillStyle = PAINT.backsheet;
  context.fillRect(0, 0, width, height);
  const face = paintCellFace(
    Math.round(FINGERS_PER_CELL_HEIGHT_CM * cellHeight(LAYOUTS.halfCut)),
    BUSBARS.halfCut.count,
  );
  cellRects(LAYOUTS.halfCut).forEach((rect) => {
    const left = toX(rect.x[0]);
    const top = toY(rect.y[1]);
    const cellWidth = (rect.x[1] - rect.x[0]) * scaleX;
    const cellHeight = (rect.y[1] - rect.y[0]) * scaleY;
    context.save();
    context.translate(left, top);
    face(context, cellWidth, cellHeight);
    context.restore();
  });
  context.fillStyle = PAINT.ribbon;
  const ribbon = Math.max(1, RIBBON.width * scaleY);
  [GRID.y[1] + RIBBON.margin, (GRID.y[0] + GRID.y[1]) / 2, GRID.y[0] - RIBBON.margin].forEach(
    (y) => {
      context.fillRect(
        toX(GRID.x[0]),
        toY(y) - ribbon / 2,
        (GRID.x[1] - GRID.x[0]) * scaleX,
        ribbon,
      );
    },
  );
}

export function moduleFaceTexture(): CanvasTexture {
  const width = Math.round((MODULE_TEXTURE_HEIGHT * LAMINATE.width) / LAMINATE.height);
  return canvasTexture(width, MODULE_TEXTURE_HEIGHT, paintModuleFace);
}
