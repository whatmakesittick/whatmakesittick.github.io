import { currentLanguage } from '@core/i18n';
import { FULL_TURN } from '@core/math';
import type { IvPoint, OperatingPoint, ShadeAnalysis } from '../model';
import { CANVAS_COLORS } from './canvasColors';
import { CanvasSurface, canvasFont, widestText } from './canvasSurface';
import type { CanvasFrame } from './canvasSurface';
import { formatAxisAmps, formatAxisVolts } from './format';

interface Plot {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface TickLabels {
  volts: string[];
  amps: string[];
}

const VOLTS_MAX = 48;
const AMPS_MAX = 16;
const VOLT_TICKS = [0, 10, 20, 30, 40] as const;
const AMP_TICKS = [0, 5, 10, 15] as const;
const LAYOUT = { right: 14, top: 12, bottom: 24, font: 11, tickGap: 6 } as const;
const LINE = { grid: 1, clear: 1.4, curve: 2.4 } as const;
const MARKER = { radius: 5, ring: 1.5 } as const;

function tickLabels(): TickLabels {
  return {
    volts: VOLT_TICKS.map((volts) => formatAxisVolts(volts)),
    amps: AMP_TICKS.map((amps) => formatAxisAmps(amps)),
  };
}

function plotOf(context: CanvasRenderingContext2D, frame: CanvasFrame, labels: TickLabels): Plot {
  context.font = canvasFont(frame, LAYOUT.font);
  return {
    left: widestText(context, labels.amps) + 2 * LAYOUT.tickGap,
    right: frame.width - LAYOUT.right,
    top: LAYOUT.top,
    bottom: frame.height - LAYOUT.bottom,
  };
}

function xOf(plot: Plot, volts: number): number {
  return plot.left + ((plot.right - plot.left) * volts) / VOLTS_MAX;
}

function yOf(plot: Plot, amps: number): number {
  return plot.bottom - ((plot.bottom - plot.top) * amps) / AMPS_MAX;
}

function paintGrid(context: CanvasRenderingContext2D, plot: Plot, labels: TickLabels): void {
  context.lineWidth = LINE.grid;
  context.strokeStyle = CANVAS_COLORS.grid;
  context.fillStyle = CANVAS_COLORS.tick;
  context.textAlign = 'right';
  context.textBaseline = 'middle';
  AMP_TICKS.forEach((amps, index) => {
    const y = yOf(plot, amps);
    context.strokeRect(plot.left, y, plot.right - plot.left, 0);
    context.fillText(labels.amps[index], plot.left - LAYOUT.tickGap, y);
  });
  context.textAlign = 'center';
  context.textBaseline = 'top';
  VOLT_TICKS.forEach((volts, index) => {
    const x = xOf(plot, volts);
    context.strokeRect(x, plot.top, 0, plot.bottom - plot.top);
    context.fillText(labels.volts[index], x, plot.bottom + LAYOUT.tickGap);
  });
  context.strokeStyle = CANVAS_COLORS.axis;
  context.strokeRect(plot.left, plot.bottom, plot.right - plot.left, 0);
  context.strokeRect(plot.left, plot.top, 0, plot.bottom - plot.top);
}

function strokeCurve(
  context: CanvasRenderingContext2D,
  plot: Plot,
  curve: readonly IvPoint[],
  color: string,
  width: number,
): void {
  if (curve.length === 0) return;
  context.beginPath();
  curve.forEach((point, index) => {
    const x = xOf(plot, point.voltage);
    const y = yOf(plot, point.current);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineJoin = 'round';
  context.stroke();
}

function paintPowerBox(context: CanvasRenderingContext2D, plot: Plot, point: OperatingPoint): void {
  if (point.power <= 0) return;
  const x = xOf(plot, point.voltage);
  const y = yOf(plot, point.current);
  context.fillStyle = CANVAS_COLORS.powerBox;
  context.fillRect(plot.left, y, x - plot.left, plot.bottom - y);
}

function paintDot(context: CanvasRenderingContext2D, plot: Plot, point: OperatingPoint): void {
  if (point.power <= 0) return;
  context.beginPath();
  context.arc(xOf(plot, point.voltage), yOf(plot, point.current), MARKER.radius, 0, FULL_TURN);
  context.fillStyle = CANVAS_COLORS.point;
  context.fill();
  context.lineWidth = MARKER.ring;
  context.strokeStyle = CANVAS_COLORS.lit;
  context.stroke();
}

function paintAnalysis(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  analysis: ShadeAnalysis,
): void {
  const labels = tickLabels();
  const plot = plotOf(context, frame, labels);
  paintGrid(context, plot, labels);
  paintPowerBox(context, plot, analysis.maximum);
  strokeCurve(context, plot, analysis.clearCurve, CANVAS_COLORS.clearCurve, LINE.clear);
  strokeCurve(context, plot, analysis.curve, CANVAS_COLORS.curve, LINE.curve);
  paintDot(context, plot, analysis.maximum);
}

export class IvCurveView {
  private readonly surface: CanvasSurface;
  private painted: ShadeAnalysis | null = null;
  private language = '';

  constructor(canvas: HTMLCanvasElement) {
    this.surface = new CanvasSurface(canvas);
  }

  draw(analysis: ShadeAnalysis): void {
    const language = currentLanguage();
    if (this.painted === analysis && language === this.language) return;
    this.painted = analysis;
    this.language = language;
    this.surface.paint((context, frame) => paintAnalysis(context, frame, analysis));
  }

  dispose(): void {
    this.surface.dispose();
  }
}
