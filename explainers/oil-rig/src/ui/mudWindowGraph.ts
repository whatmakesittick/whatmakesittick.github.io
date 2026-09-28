import { formatFixed } from '@core/format';
import { currentLanguage } from '@core/i18n';
import { FULL_TURN } from '@core/math';
import type { MudState } from '../ids';
import {
  DRILL_FLOOR_ABOVE_SEA_M,
  SEABED_DEPTH_M,
  TOTAL_DEPTH_M,
  fracturePressureBar,
  mudColumnBar,
  porePressureBar,
} from '../model';
import { CANVAS_COLORS } from './canvasColors';
import { CanvasSurface, canvasFont, widestText } from './canvasSurface';
import type { CanvasFrame } from './canvasSurface';
import { formatBar, formatMetres } from './format';

export interface MudSight {
  mudWeight: number;
  bitDepth: number;
  riser: boolean;
  state: MudState;
}

interface Plot {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

type PressureAt = (depth: number) => number;

const LAYOUT = { right: 14, top: 24, bottom: 10, font: 11, tickGap: 6, labelGap: 8 } as const;
const PRESSURE_MAX_BAR = 800;
const PRESSURE_TICKS_BAR = [0, 200, 400, 600, 800] as const;
const DEPTH_TICKS_M = [0, 1000, 2000, 3000, 4000] as const;
const SAMPLE_STEP_M = 25;
export const DEPTH_BUCKET_M = 10;
const LINE = { grid: 1, curve: 1.8, mud: 2.4 } as const;
const MARKER = { radius: 4.5, ring: 1.5, dash: [4, 4] } as const;
const SEABED_DASH = [6, 4];

export function depthBucket(depth: number): number {
  return Math.round(depth / DEPTH_BUCKET_M) * DEPTH_BUCKET_M;
}

function xOf(plot: Plot, bar: number): number {
  return plot.left + ((plot.right - plot.left) * bar) / PRESSURE_MAX_BAR;
}

function yOf(plot: Plot, depth: number): number {
  return plot.top + ((plot.bottom - plot.top) * depth) / TOTAL_DEPTH_M;
}

function depthLabels(): string[] {
  return DEPTH_TICKS_M.map((depth) => formatMetres(depth));
}

function plotOf(context: CanvasRenderingContext2D, frame: CanvasFrame): Plot {
  context.font = canvasFont(LAYOUT.font);
  return {
    left: widestText(context, depthLabels()) + 2 * LAYOUT.tickGap,
    right: frame.width - LAYOUT.right,
    top: LAYOUT.top,
    bottom: frame.height - LAYOUT.bottom,
  };
}

function traceCurve(
  context: CanvasRenderingContext2D,
  plot: Plot,
  pressure: PressureAt,
  from: number,
  to: number,
): void {
  for (let depth = from; depth <= to; depth += SAMPLE_STEP_M) {
    context.lineTo(xOf(plot, pressure(depth)), yOf(plot, depth));
  }
  context.lineTo(xOf(plot, pressure(to)), yOf(plot, to));
}

function strokeCurve(
  context: CanvasRenderingContext2D,
  plot: Plot,
  pressure: PressureAt,
  from: number,
  color: string,
): void {
  context.beginPath();
  context.moveTo(xOf(plot, pressure(from)), yOf(plot, from));
  traceCurve(context, plot, pressure, from, TOTAL_DEPTH_M);
  context.strokeStyle = color;
  context.lineWidth = LINE.curve;
  context.stroke();
}

function clipTo(context: CanvasRenderingContext2D, plot: Plot, top: number, bottom: number): void {
  context.beginPath();
  context.rect(plot.left, top, plot.right - plot.left, bottom - top);
  context.clip();
}

function paintBands(context: CanvasRenderingContext2D, plot: Plot): void {
  const sea = yOf(plot, DRILL_FLOOR_ABOVE_SEA_M);
  const seabed = yOf(plot, SEABED_DEPTH_M);
  context.fillStyle = CANVAS_COLORS.seaBand;
  context.fillRect(plot.left, sea, plot.right - plot.left, seabed - sea);
  context.fillStyle = CANVAS_COLORS.rockBand;
  context.fillRect(plot.left, seabed, plot.right - plot.left, plot.bottom - seabed);
}

function paintGrid(context: CanvasRenderingContext2D, plot: Plot): void {
  const labels = depthLabels();
  context.font = canvasFont(LAYOUT.font);
  context.lineWidth = LINE.grid;
  context.textBaseline = 'middle';
  context.textAlign = 'right';
  DEPTH_TICKS_M.forEach((depth, index) => {
    const y = yOf(plot, depth);
    context.strokeStyle = CANVAS_COLORS.grid;
    context.strokeRect(plot.left, y, plot.right - plot.left, 0);
    context.fillStyle = CANVAS_COLORS.tick;
    context.fillText(labels[index], plot.left - LAYOUT.tickGap, y);
  });
  PRESSURE_TICKS_BAR.forEach((bar) => {
    context.strokeStyle = CANVAS_COLORS.grid;
    context.strokeRect(xOf(plot, bar), plot.top, 0, plot.bottom - plot.top);
  });
  paintPressureLabels(context, plot);
}

function paintPressureLabels(context: CanvasRenderingContext2D, plot: Plot): void {
  const lastIndex = PRESSURE_TICKS_BAR.length - 1;
  let freeUntil = Infinity;
  context.textBaseline = 'bottom';
  context.fillStyle = CANVAS_COLORS.tick;
  for (let index = lastIndex; index >= 0; index--) {
    const bar = PRESSURE_TICKS_BAR[index];
    const isLast = index === lastIndex;
    const label = isLast ? formatBar(bar) : formatFixed(bar, 0);
    const width = context.measureText(label).width;
    const x = xOf(plot, bar);
    const left = isLast ? x - width : x - width / 2;
    if (left + width + LAYOUT.labelGap > freeUntil) continue;
    context.textAlign = isLast ? 'right' : 'center';
    context.fillText(label, x, plot.top - LAYOUT.tickGap);
    freeUntil = left;
  }
}

function paintWindow(context: CanvasRenderingContext2D, plot: Plot): void {
  context.beginPath();
  context.moveTo(xOf(plot, porePressureBar(SEABED_DEPTH_M)), yOf(plot, SEABED_DEPTH_M));
  traceCurve(context, plot, porePressureBar, SEABED_DEPTH_M, TOTAL_DEPTH_M);
  for (let depth = TOTAL_DEPTH_M; depth >= SEABED_DEPTH_M; depth -= SAMPLE_STEP_M) {
    context.lineTo(xOf(plot, fracturePressureBar(depth)), yOf(plot, depth));
  }
  context.closePath();
  context.fillStyle = CANVAS_COLORS.window;
  context.fill();
}

function paintSeabed(context: CanvasRenderingContext2D, plot: Plot): void {
  const y = yOf(plot, SEABED_DEPTH_M);
  context.setLineDash(SEABED_DASH);
  context.strokeStyle = CANVAS_COLORS.seabedLine;
  context.lineWidth = LINE.grid;
  context.strokeRect(plot.left, y, plot.right - plot.left, 0);
  context.setLineDash([]);
}

function paintBackdrop(context: CanvasRenderingContext2D, plot: Plot): void {
  paintBands(context, plot);
  paintGrid(context, plot);
  context.save();
  clipTo(context, plot, plot.top, plot.bottom);
  paintWindow(context, plot);
  strokeCurve(context, plot, porePressureBar, DRILL_FLOOR_ABOVE_SEA_M, CANVAS_COLORS.pore);
  strokeCurve(context, plot, fracturePressureBar, SEABED_DEPTH_M, CANVAS_COLORS.fracture);
  context.restore();
  paintSeabed(context, plot);
}

function paintMudLine(context: CanvasRenderingContext2D, plot: Plot, sight: MudSight): void {
  const pressure = (depth: number) => mudColumnBar(depth, sight.mudWeight, sight.riser);
  const bit = yOf(plot, sight.bitDepth);
  [
    { top: plot.top, bottom: bit, color: CANVAS_COLORS.mud },
    { top: bit, bottom: plot.bottom, color: CANVAS_COLORS.mudAhead },
  ].forEach(({ top, bottom, color }) => {
    context.save();
    clipTo(context, plot, top, bottom);
    context.beginPath();
    context.moveTo(xOf(plot, 0), yOf(plot, 0));
    traceCurve(context, plot, pressure, 0, TOTAL_DEPTH_M);
    context.strokeStyle = color;
    context.lineWidth = LINE.mud;
    context.stroke();
    context.restore();
  });
}

function paintMarker(context: CanvasRenderingContext2D, plot: Plot, sight: MudSight): void {
  const y = yOf(plot, sight.bitDepth);
  context.setLineDash(MARKER.dash);
  context.strokeStyle = CANVAS_COLORS.marker;
  context.lineWidth = LINE.grid;
  context.strokeRect(plot.left, y, plot.right - plot.left, 0);
  context.setLineDash([]);
  const x = Math.min(
    xOf(plot, mudColumnBar(sight.bitDepth, sight.mudWeight, sight.riser)),
    plot.right,
  );
  context.beginPath();
  context.arc(x, y, MARKER.radius, 0, FULL_TURN);
  context.fillStyle = sight.state === 'safe' ? CANVAS_COLORS.mud : CANVAS_COLORS.danger;
  context.fill();
  context.lineWidth = MARKER.ring;
  context.strokeStyle = CANVAS_COLORS.lit;
  context.stroke();
}

class Backdrop {
  private readonly canvas = document.createElement('canvas');
  private key = '';

  draw(context: CanvasRenderingContext2D, frame: CanvasFrame, plot: Plot): void {
    const key = `${frame.width}:${frame.ratio}:${currentLanguage()}`;
    if (key !== this.key) this.render(frame, plot, key);
    context.drawImage(this.canvas, 0, 0, frame.width, frame.height);
  }

  private render(frame: CanvasFrame, plot: Plot, key: string): void {
    this.canvas.width = Math.round(frame.width * frame.ratio);
    this.canvas.height = Math.round(frame.height * frame.ratio);
    const context = this.canvas.getContext('2d');
    if (!context) return;
    context.setTransform(frame.ratio, 0, 0, frame.ratio, 0, 0);
    paintBackdrop(context, plot);
    this.key = key;
  }
}

function sameSight(a: MudSight | null, b: MudSight): boolean {
  return (
    a !== null &&
    a.mudWeight === b.mudWeight &&
    a.riser === b.riser &&
    a.state === b.state &&
    depthBucket(a.bitDepth) === depthBucket(b.bitDepth)
  );
}

export class MudWindowGraph {
  private readonly surface: CanvasSurface;
  private readonly backdrop = new Backdrop();
  private painted: MudSight | null = null;
  private language = '';

  constructor(canvas: HTMLCanvasElement) {
    this.surface = new CanvasSurface(canvas);
  }

  draw(sight: MudSight): void {
    const language = currentLanguage();
    if (sameSight(this.painted, sight) && language === this.language) return;
    this.painted = sight;
    this.language = language;
    this.surface.paint((context, frame) => {
      const plot = plotOf(context, frame);
      this.backdrop.draw(context, frame, plot);
      paintMudLine(context, plot, sight);
      paintMarker(context, plot, sight);
    });
  }

  dispose(): void {
    this.surface.dispose();
  }
}
