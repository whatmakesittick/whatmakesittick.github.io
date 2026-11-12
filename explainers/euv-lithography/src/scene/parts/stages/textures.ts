import { CanvasTexture, SRGBColorSpace } from 'three';
import type { PartContext } from '../context';
import { MASK, WAFER } from '../../../model/layout';
import { fieldMm } from '../../../model/optics';
import type { OpticsId } from '../../../ids';
import { MASK_PATTERN_PX_PER_MM, WAFER_TEXTURE_PX } from './dims';

type BlockKind = 'across' | 'down' | 'cells' | 'solid';
type Block = readonly [x: number, y: number, w: number, h: number, kind: BlockKind];

const BLOCKS: readonly Block[] = [
  [0.02, 0.03, 0.46, 0.3, 'across'],
  [0.52, 0.03, 0.46, 0.3, 'down'],
  [0.02, 0.37, 0.3, 0.28, 'cells'],
  [0.36, 0.37, 0.28, 0.28, 'across'],
  [0.68, 0.37, 0.3, 0.28, 'cells'],
  [0.02, 0.69, 0.46, 0.28, 'down'],
  [0.52, 0.69, 0.22, 0.28, 'solid'],
  [0.78, 0.69, 0.2, 0.28, 'across'],
];
const ABSORBER_BASE = '#080b10';
const METAL_LINES = ['#e4ebf7', '#b7c6e2', '#cfd9ec'] as const;
const BORDER_MM = 2;
const MASK_PITCH_PX = 6;
const DIE_PITCH_PX = 3;
const HUE_BASE = 200;
const HUE_STEP = 22;
const HUE_CYCLE = 5;
const WAFER_BASE_COLOR = '#39424e';
const DIE_INK = 'rgba(14, 20, 32, 0.55)';
const SCRIBE = 'rgba(214, 224, 238, 0.8)';
const SCRIBE_WIDTH = 1.5;
const FIELD_ALPHA = 0.6;
const ANISOTROPY = 8;
const FRAME_LINE_PX = 3;
const MARK_PX = 24;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function drawBlock(g: CanvasRenderingContext2D, area: Rect, kind: BlockKind, pitch: number): void {
  const { x, y, w, h } = area;
  const thin = Math.max(1, pitch / 2);
  if (kind === 'solid') {
    g.fillRect(x, y, w, h);
    return;
  }
  const steps = kind === 'cells' ? pitch * 2 : pitch;
  if (kind !== 'down') {
    for (let row = y; row < y + h - thin; row += steps) {
      if (kind === 'across') g.fillRect(x, row, w, thin);
      else
        for (let col = x; col < x + w - pitch; col += pitch * 2) g.fillRect(col, row, pitch, pitch);
    }
    return;
  }
  for (let col = x; col < x + w - thin; col += steps) g.fillRect(col, y, thin, h);
}

function drawLayout(
  g: CanvasRenderingContext2D,
  area: Rect,
  pitch: number,
  inks: readonly string[],
): void {
  BLOCKS.forEach(([fx, fy, fw, fh, kind], index) => {
    g.fillStyle = inks[index % inks.length];
    const block = {
      x: area.x + fx * area.w,
      y: area.y + fy * area.h,
      w: fw * area.w,
      h: fh * area.h,
    };
    drawBlock(g, block, kind, pitch);
  });
}

function paint(
  width: number,
  height: number,
  draw: (g: CanvasRenderingContext2D) => void,
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d');
  if (g) draw(g);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

function drawFrame(g: CanvasRenderingContext2D, width: number, height: number): void {
  g.fillStyle = METAL_LINES[0];
  g.fillRect(0, 0, width, FRAME_LINE_PX);
  g.fillRect(0, height - FRAME_LINE_PX, width, FRAME_LINE_PX);
  g.fillRect(0, 0, FRAME_LINE_PX, height);
  g.fillRect(width - FRAME_LINE_PX, 0, FRAME_LINE_PX, height);
  [0, width - MARK_PX].forEach((x) =>
    [0, height - MARK_PX].forEach((y) => g.fillRect(x, y, MARK_PX, MARK_PX / 3)),
  );
}

export function maskPatternTexture(context: PartContext): CanvasTexture {
  const width = Math.round(MASK.patternM.height * 1000 * MASK_PATTERN_PX_PER_MM);
  const height = Math.round(MASK.patternM.width * 1000 * MASK_PATTERN_PX_PER_MM);
  const border = BORDER_MM * MASK_PATTERN_PX_PER_MM;
  const texture = paint(width, height, (g) => {
    g.fillStyle = ABSORBER_BASE;
    g.fillRect(0, 0, width, height);
    drawLayout(
      g,
      { x: border, y: border, w: width - border * 2, h: height - border * 2 },
      MASK_PITCH_PX,
      METAL_LINES,
    );
    drawFrame(g, width, height);
  });
  return context.tracker.track(texture);
}

function fieldTint(column: number, row: number): string {
  const hue =
    HUE_BASE + ((((column * 7 + row * 13) % HUE_CYCLE) + HUE_CYCLE) % HUE_CYCLE) * HUE_STEP;
  return `hsla(${hue}, 50%, 62%, ${FIELD_ALPHA})`;
}

export function waferFieldTexture(context: PartContext, optics: OpticsId): CanvasTexture {
  const field = fieldMm(optics);
  const pxPerMm = WAFER_TEXTURE_PX / (WAFER.diameterM * 1000);
  const cellW = field.h * pxPerMm;
  const cellH = field.w * pxPerMm;
  const middle = WAFER_TEXTURE_PX / 2;
  const texture = paint(WAFER_TEXTURE_PX, WAFER_TEXTURE_PX, (g) => {
    g.fillStyle = WAFER_BASE_COLOR;
    g.fillRect(0, 0, WAFER_TEXTURE_PX, WAFER_TEXTURE_PX);
    const reach = (WAFER.diameterM * 1000) / 2;
    const rows = Math.ceil(reach / field.w);
    const columns = Math.ceil(reach / field.h);
    for (let row = -rows; row <= rows; row += 1) {
      for (let column = -columns; column <= columns; column += 1) {
        const near = Math.hypot(
          Math.max(Math.abs(column) * field.h - field.h / 2, 0),
          Math.max(Math.abs(row) * field.w - field.w / 2, 0),
        );
        if (near > reach) continue;
        const area = {
          x: middle + (column - 0.5) * cellW,
          y: middle + (row - 0.5) * cellH,
          w: cellW,
          h: cellH,
        };
        g.fillStyle = fieldTint(column, row);
        g.fillRect(area.x, area.y, area.w, area.h);
        drawLayout(
          g,
          { x: area.x + 2, y: area.y + 2, w: area.w - 4, h: area.h - 4 },
          DIE_PITCH_PX,
          [DIE_INK],
        );
        g.strokeStyle = SCRIBE;
        g.lineWidth = SCRIBE_WIDTH;
        g.strokeRect(area.x, area.y, area.w, area.h);
      }
    }
  });
  return context.tracker.track(texture);
}
