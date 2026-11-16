import { withAlpha } from '@core/color';
import { formatNumber } from '@core/format';
import { currentLanguage, t } from '@core/i18n';
import { CanvasSurface, canvasFont } from '@core/ui/canvasSurface';
import type { CanvasFrame } from '@core/ui/canvasSurface';
import type { Disposer } from '@core/ui/disposers';
import { requireElement } from '@core/ui/dom';
import { watchShallowLocalized } from '@core/ui/subscribe';
import {
  BISULFITE_START_M,
  CYCLE_UNITS,
  bisulfiteAt,
  iodineAt,
  realAt,
  runEndSeconds,
  toMillimolar,
} from '../model';
import { switchSecondsOf } from '../state';
import type { ClockStore } from '../state';
import { THEME } from '../theme';
import { formatSwitchSeconds } from './format';

export const AXIS_MAX_MM = toMillimolar(BISULFITE_START_M);
const MM_TICK = 2.5;
const WIDE_TICK_S = 5;
const NARROW_TICK_S = 2;
const NARROW_AXIS_S = 10;
export const GRAPH_SAMPLES = 240;
const TICK_FONT_PX = 11;
const LABEL_FONT_PX = 12;
const PAD_LEFT = 34;
const PAD_RIGHT = 12;
const PAD_TOP = 24;
const PAD_BOTTOM = 36;
const TICK_GAP = 6;
const CURVE_WIDTH = 2;
const CURSOR_WIDTH = 1.5;
const SWITCH_WIDTH = 1;
const GRID_ALPHA = 0.14;
const SWITCH_LABEL_GAP = 4;
const HALF = 0.5;
const GRAPH_CANVAS = '[data-graph="clock"] canvas';

export const GRAPH_COLORS = {
  grid: withAlpha(THEME.muted, GRID_ALPHA),
  tick: THEME.muted,
  label: THEME.text,
  bisulfite: THEME.sulfur,
  iodine: THEME.iodinePhase,
  switch: THEME.accent,
  cursor: THEME.text,
} as const;

export const SWITCH_DASH: readonly number[] = [5, 4];

export interface GraphMoment {
  switchAt: number;
  seconds: number;
}

export interface Plot {
  left: number;
  right: number;
  top: number;
  bottom: number;
  endSeconds: number;
}

export function plotOf(frame: CanvasFrame, switchAt: number): Plot {
  return {
    left: PAD_LEFT,
    right: frame.width - PAD_RIGHT,
    top: PAD_TOP,
    bottom: frame.height - PAD_BOTTOM,
    endSeconds: runEndSeconds(switchAt),
  };
}

export function xOfSeconds(plot: Plot, seconds: number): number {
  return plot.left + (seconds / plot.endSeconds) * (plot.right - plot.left);
}

export function yOfMillimolar(plot: Plot, millimolar: number): number {
  return plot.bottom - (millimolar / AXIS_MAX_MM) * (plot.bottom - plot.top);
}

export function timeTickStep(endSeconds: number): number {
  return endSeconds < NARROW_AXIS_S ? NARROW_TICK_S : WIDE_TICK_S;
}

function ticks(limit: number, step: number): number[] {
  return Array.from({ length: Math.floor(limit / step) + 1 }, (_, index) => index * step);
}

export function sampleSeconds(switchAt: number): number[] {
  return Array.from({ length: GRAPH_SAMPLES + 1 }, (_, index) =>
    realAt((index / GRAPH_SAMPLES) * CYCLE_UNITS, switchAt),
  );
}

function paintGrid(context: CanvasRenderingContext2D, frame: CanvasFrame, plot: Plot): void {
  context.strokeStyle = GRAPH_COLORS.grid;
  context.lineWidth = 1;
  context.font = canvasFont(frame, TICK_FONT_PX);
  context.fillStyle = GRAPH_COLORS.tick;
  context.textBaseline = 'middle';
  context.textAlign = 'right';
  ticks(AXIS_MAX_MM, MM_TICK).forEach((millimolar) => {
    const y = yOfMillimolar(plot, millimolar);
    context.beginPath();
    context.moveTo(plot.left, y);
    context.lineTo(plot.right, y);
    context.stroke();
    context.fillText(formatNumber(millimolar), plot.left - TICK_GAP, y);
  });
  context.textBaseline = 'top';
  context.textAlign = 'center';
  ticks(plot.endSeconds, timeTickStep(plot.endSeconds)).forEach((seconds) => {
    context.fillText(formatNumber(seconds), xOfSeconds(plot, seconds), plot.bottom + TICK_GAP);
  });
}

function paintAxisTitles(context: CanvasRenderingContext2D, frame: CanvasFrame, plot: Plot): void {
  context.font = canvasFont(frame, LABEL_FONT_PX);
  context.fillStyle = GRAPH_COLORS.label;
  context.textBaseline = 'bottom';
  context.textAlign = 'center';
  context.fillText(t('chapters.graph.time'), (plot.left + plot.right) * HALF, frame.height);
  context.textBaseline = 'top';
  context.textAlign = 'left';
  context.fillText(t('chapters.graph.unit'), 0, 0);
}

function paintCurve(
  context: CanvasRenderingContext2D,
  plot: Plot,
  color: string,
  molarAt: (seconds: number) => number,
  samples: readonly number[],
): void {
  context.strokeStyle = color;
  context.lineWidth = CURVE_WIDTH;
  context.setLineDash([]);
  context.beginPath();
  samples.forEach((seconds, index) => {
    const x = xOfSeconds(plot, seconds);
    const y = yOfMillimolar(plot, toMillimolar(molarAt(seconds)));
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
}

function verticalLine(context: CanvasRenderingContext2D, plot: Plot, x: number): void {
  context.beginPath();
  context.moveTo(x, plot.top);
  context.lineTo(x, plot.bottom);
  context.stroke();
}

function paintSwitch(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  plot: Plot,
  switchAt: number,
): void {
  const x = xOfSeconds(plot, switchAt);
  context.save();
  context.strokeStyle = GRAPH_COLORS.switch;
  context.lineWidth = SWITCH_WIDTH;
  context.setLineDash(SWITCH_DASH);
  verticalLine(context, plot, x);
  context.restore();
  context.font = canvasFont(frame, TICK_FONT_PX);
  context.fillStyle = GRAPH_COLORS.switch;
  context.textBaseline = 'bottom';
  context.textAlign = 'right';
  const label = t('chapters.graph.switch', { seconds: formatSwitchSeconds(switchAt) });
  context.fillText(label, x - SWITCH_LABEL_GAP, plot.top - SWITCH_LABEL_GAP);
}

function paintCursor(context: CanvasRenderingContext2D, plot: Plot, seconds: number): void {
  context.strokeStyle = GRAPH_COLORS.cursor;
  context.lineWidth = CURSOR_WIDTH;
  context.setLineDash([]);
  verticalLine(context, plot, xOfSeconds(plot, seconds));
}

export function paintClockGraph(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  { switchAt, seconds }: GraphMoment,
): void {
  const plot = plotOf(frame, switchAt);
  const samples = sampleSeconds(switchAt);
  paintGrid(context, frame, plot);
  paintAxisTitles(context, frame, plot);
  paintCurve(context, plot, GRAPH_COLORS.bisulfite, (at) => bisulfiteAt(at, switchAt), samples);
  paintCurve(context, plot, GRAPH_COLORS.iodine, (at) => iodineAt(at, switchAt), samples);
  paintSwitch(context, frame, plot, switchAt);
  paintCursor(context, plot, seconds);
}

export class ClockGraphView {
  private readonly surface: CanvasSurface;
  private painted: GraphMoment | null = null;
  private language = '';

  constructor(canvas: HTMLCanvasElement) {
    this.surface = new CanvasSurface(canvas);
  }

  draw(moment: GraphMoment): void {
    const language = currentLanguage();
    if (this.isPainted(moment) && language === this.language) return;
    this.painted = { ...moment };
    this.language = language;
    this.surface.paint((context, frame) => paintClockGraph(context, frame, moment));
  }

  private isPainted({ switchAt, seconds }: GraphMoment): boolean {
    return this.painted?.switchAt === switchAt && this.painted.seconds === seconds;
  }

  dispose(): void {
    this.surface.dispose();
  }
}

export function mountClockGraph(root: ParentNode, store: ClockStore): Disposer {
  const view = new ClockGraphView(requireElement<HTMLCanvasElement>(root, GRAPH_CANVAS));
  const stopWatching = watchShallowLocalized(
    store,
    (state) => [switchSecondsOf(state), state.phase] as const,
    ([switchAt, units]) => view.draw({ switchAt, seconds: realAt(units, switchAt) }),
  );
  return () => {
    stopWatching();
    view.dispose();
  };
}
