import { CanvasTexture, SRGBColorSpace } from 'three';
import type { PartContext } from '../context';
import { MASK, WAFER } from '../../../model/layout';
import { fieldMm } from '../../../model/optics';
import type { OpticsId } from '../../../ids';
import { THEME } from '../../../theme';
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
const MASK_BASE = ['#56637b', '#3a4560', '#6d7a95'] as const;
const ABSORBER = 'rgba(10, 13, 18, 0.88)';
const BORDER_MM = 2;
const MASK_PITCH_PX = 4;
const DIE_PITCH_PX = 3;
const HUE_BASE = 200;
const HUE_STEP = 22;
const HUE_CYCLE = 5;
const SCRIBE = 'rgba(28, 34, 44, 0.55)';

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

function drawLayout(g: CanvasRenderingContext2D, area: Rect, pitch: number): void {
  BLOCKS.forEach(([fx, fy, fw, fh, kind]) => {
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
  return texture;
}

export function maskPatternTexture(context: PartContext): CanvasTexture {
  const width = Math.round(MASK.patternM.height * 1000 * MASK_PATTERN_PX_PER_MM);
  const height = Math.round(MASK.patternM.width * 1000 * MASK_PATTERN_PX_PER_MM);
  const border = BORDER_MM * MASK_PATTERN_PX_PER_MM;
  const texture = paint(width, height, (g) => {
    const sheen = g.createLinearGradient(0, 0, width, height);
    MASK_BASE.forEach((color, index) => sheen.addColorStop(index / (MASK_BASE.length - 1), color));
    g.fillStyle = sheen;
    g.fillRect(0, 0, width, height);
    g.fillStyle = ABSORBER;
    drawLayout(
      g,
      { x: border, y: border, w: width - border * 2, h: height - border * 2 },
      MASK_PITCH_PX,
    );
    g.fillRect(0, 0, width, border / 2);
    g.fillRect(0, height - border / 2, width, border / 2);
  });
  return context.tracker.track(texture);
}

function fieldTint(column: number, row: number): string {
  const hue =
    HUE_BASE + ((((column * 7 + row * 13) % HUE_CYCLE) + HUE_CYCLE) % HUE_CYCLE) * HUE_STEP;
  return `hsla(${hue}, 38%, 62%, 0.3)`;
}

export function waferFieldTexture(context: PartContext, optics: OpticsId): CanvasTexture {
  const field = fieldMm(optics);
  const pxPerMm = WAFER_TEXTURE_PX / (WAFER.diameterM * 1000);
  const cellW = field.h * pxPerMm;
  const cellH = field.w * pxPerMm;
  const middle = WAFER_TEXTURE_PX / 2;
  const texture = paint(WAFER_TEXTURE_PX, WAFER_TEXTURE_PX, (g) => {
    g.fillStyle = THEME.wafer;
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
        g.fillStyle = 'rgba(30, 36, 48, 0.35)';
        drawLayout(g, { x: area.x + 2, y: area.y + 2, w: area.w - 4, h: area.h - 4 }, DIE_PITCH_PX);
        g.strokeStyle = SCRIBE;
        g.strokeRect(area.x, area.y, area.w, area.h);
      }
    }
  });
  return context.tracker.track(texture);
}
