import { FULL_TURN } from '@core/math';
import { widestText } from '@core/ui/canvasSurface';
import type { Curve } from '../model';
import { BEAT_MS } from '../model';
import { CANVAS_COLORS } from './canvasColors';
import { formatMs } from './format';

export interface Plot {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Scale {
  min: number;
  max: number;
}

export interface BeatSample {
  time: number;
  value: number;
}

export const TIME_TICKS_MS = [0, 200, 400, 600, 800] as const;

const DOT = { radius: 3.5, ring: 1.2 } as const;
const TICK_LABEL_GAP = 8;
const EDGE_LABEL_SHARE = 1.5;
const THINNED_TICK_STEP = 2;
const CURSOR_WIDTH = 1.5;

export function xOfTime(plot: Plot, time: number): number {
  return plot.left + ((plot.right - plot.left) * time) / BEAT_MS;
}

export function yOfValue(plot: Plot, value: number, scale: Scale): number {
  const share = (value - scale.min) / (scale.max - scale.min);
  return plot.bottom - (plot.bottom - plot.top) * share;
}

export function sampleBeat(curve: Curve, stepMs: number): readonly BeatSample[] {
  const samples: BeatSample[] = [];
  for (let time = 0; time < BEAT_MS; time += stepMs) samples.push({ time, value: curve(time) });
  samples.push({ time: BEAT_MS, value: curve(BEAT_MS) });
  return samples;
}

export function timeTickLabels(): string[] {
  return TIME_TICKS_MS.map((time) => formatMs(time));
}

function tickAlignment(index: number, count: number): CanvasTextAlign {
  if (index === 0) return 'left';
  if (index === count - 1) return 'right';
  return 'center';
}

export function shownTimeTicks(plot: Plot, widestLabel: number): number[] {
  const spacing = (plot.right - plot.left) / (TIME_TICKS_MS.length - 1);
  const fits = spacing >= EDGE_LABEL_SHARE * widestLabel + TICK_LABEL_GAP;
  const step = fits ? 1 : THINNED_TICK_STEP;
  return TIME_TICKS_MS.map((_, index) => index).filter((index) => index % step === 0);
}

export function paintTimeTicks(
  context: CanvasRenderingContext2D,
  plot: Plot,
  baseline: number,
  labels: readonly string[],
): void {
  context.fillStyle = CANVAS_COLORS.tick;
  context.textBaseline = 'top';
  shownTimeTicks(plot, widestText(context, labels)).forEach((index) => {
    context.textAlign = tickAlignment(index, TIME_TICKS_MS.length);
    context.fillText(labels[index], xOfTime(plot, TIME_TICKS_MS[index]), baseline);
  });
}

export function strokeBeat(
  context: CanvasRenderingContext2D,
  plot: Plot,
  samples: readonly BeatSample[],
  scale: Scale,
  style: { color: string; width: number },
): void {
  context.beginPath();
  samples.forEach(({ time, value }, index) => {
    const x = xOfTime(plot, time);
    const y = yOfValue(plot, value, scale);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.strokeStyle = style.color;
  context.lineWidth = style.width;
  context.lineJoin = 'round';
  context.stroke();
}

export function paintCursor(
  context: CanvasRenderingContext2D,
  x: number,
  top: number,
  bottom: number,
): void {
  context.strokeStyle = CANVAS_COLORS.cursor;
  context.lineWidth = CURSOR_WIDTH;
  context.beginPath();
  context.moveTo(x, top);
  context.lineTo(x, bottom);
  context.stroke();
}

export function paintDot(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
): void {
  context.beginPath();
  context.arc(x, y, DOT.radius, 0, FULL_TURN);
  context.fillStyle = color;
  context.fill();
  context.lineWidth = DOT.ring;
  context.strokeStyle = CANVAS_COLORS.lit;
  context.stroke();
}
