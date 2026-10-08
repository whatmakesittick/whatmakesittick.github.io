import { withAlpha } from '@core/color';
import { currentLanguage, t } from '@core/i18n';
import { FULL_TURN } from '@core/math';
import { CanvasSurface, canvasFont } from '@core/ui/canvasSurface';
import type { CanvasFrame } from '@core/ui/canvasSurface';
import type { Disposer } from '@core/ui/disposers';
import { requireElement } from '@core/ui/dom';
import { watchShallowLocalized } from '@core/ui/subscribe';
import { BETZ_LIMIT, turbinePowerKw, windPowerKw } from '../model';
import { WIND_OVERRIDE_RANGE, liveReading } from '../state';
import type { WindFarmStore } from '../state';
import { THEME } from '../theme';

export const AXIS_WIND_MS = WIND_OVERRIDE_RANGE.max;
export const AXIS_POWER_KW = 10_000;
const WIND_TICK_MS = 5;
const POWER_TICK_KW = 2_000;
const KW_PER_MW = 1000;
const SAMPLE_STEP_MS = 0.1;
const TICK_FONT_PX = 11;
const LABEL_FONT_PX = 12;
const PAD_LEFT = 30;
const PAD_RIGHT = 10;
const PAD_TOP = 22;
const PAD_BOTTOM = 34;
const TICK_GAP = 6;
const LEGEND_LINE = 16;
const LEGEND_GAP = 6;
const LEGEND_ROW = 16;
const LEGEND_INSET = 8;
const CURVE_WIDTH = 2;
const DOT_RADIUS = 4.5;
const DOT_RING = 1.5;
const GRID_ALPHA = 0.14;
const POWER_CURVE_CANVAS = '[data-canvas="power-curve"]';

export const CURVE_COLORS = {
  grid: withAlpha(THEME.muted, GRID_ALPHA),
  tick: THEME.muted,
  label: THEME.text,
  wind: THEME.wind,
  betz: THEME.evening,
  turbine: THEME.afternoon,
  dotRing: THEME.text,
} as const;

interface Line {
  key: string;
  color: string;
  powerKw: (wind: number) => number;
}

const LINES: readonly Line[] = [
  { key: 'chapters.curve.lineWind', color: CURVE_COLORS.wind, powerKw: windPowerKw },
  {
    key: 'chapters.curve.lineBetz',
    color: CURVE_COLORS.betz,
    powerKw: (wind) => BETZ_LIMIT * windPowerKw(wind),
  },
  { key: 'chapters.curve.lineTurbine', color: CURVE_COLORS.turbine, powerKw: turbinePowerKw },
];

export interface CurvePoint {
  wind: number;
  powerKw: number;
}

export interface Plot {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function plotOf(frame: CanvasFrame): Plot {
  return {
    left: PAD_LEFT,
    right: frame.width - PAD_RIGHT,
    top: PAD_TOP,
    bottom: frame.height - PAD_BOTTOM,
  };
}

export function xOfWind(plot: Plot, wind: number): number {
  return plot.left + (wind / AXIS_WIND_MS) * (plot.right - plot.left);
}

export function yOfPower(plot: Plot, kw: number): number {
  const share = Math.min(kw, AXIS_POWER_KW) / AXIS_POWER_KW;
  return plot.bottom - share * (plot.bottom - plot.top);
}

function ticks(limit: number, step: number): number[] {
  return Array.from({ length: Math.floor(limit / step) + 1 }, (_, index) => index * step);
}

function paintGrid(context: CanvasRenderingContext2D, frame: CanvasFrame, plot: Plot): void {
  context.strokeStyle = CURVE_COLORS.grid;
  context.lineWidth = 1;
  context.font = canvasFont(frame, TICK_FONT_PX);
  context.fillStyle = CURVE_COLORS.tick;
  context.textBaseline = 'middle';
  context.textAlign = 'right';
  ticks(AXIS_POWER_KW, POWER_TICK_KW).forEach((kw) => {
    const y = yOfPower(plot, kw);
    context.beginPath();
    context.moveTo(plot.left, y);
    context.lineTo(plot.right, y);
    context.stroke();
    context.fillText(String(kw / KW_PER_MW), plot.left - TICK_GAP, y);
  });
  context.textBaseline = 'top';
  context.textAlign = 'center';
  ticks(AXIS_WIND_MS, WIND_TICK_MS).forEach((wind) => {
    context.fillText(String(wind), xOfWind(plot, wind), plot.bottom + TICK_GAP);
  });
}

function paintAxisLabels(context: CanvasRenderingContext2D, frame: CanvasFrame, plot: Plot): void {
  context.font = canvasFont(frame, LABEL_FONT_PX);
  context.fillStyle = CURVE_COLORS.label;
  context.textBaseline = 'bottom';
  context.textAlign = 'center';
  context.fillText(t('chapters.curve.axisWind'), (plot.left + plot.right) / 2, frame.height);
  context.textBaseline = 'top';
  context.textAlign = 'left';
  context.fillText(t('chapters.curve.axisPower'), 0, 0);
}

function paintLine(context: CanvasRenderingContext2D, plot: Plot, line: Line): void {
  context.save();
  context.beginPath();
  context.rect(plot.left, plot.top, plot.right - plot.left, plot.bottom - plot.top);
  context.clip();
  context.strokeStyle = line.color;
  context.lineWidth = CURVE_WIDTH;
  context.beginPath();
  ticks(AXIS_WIND_MS, SAMPLE_STEP_MS).forEach((wind, index) => {
    const x = xOfWind(plot, wind);
    const y = yOfPower(plot, line.powerKw(wind));
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
  context.restore();
}

function paintLegend(context: CanvasRenderingContext2D, frame: CanvasFrame, plot: Plot): void {
  context.font = canvasFont(frame, LABEL_FONT_PX);
  context.textBaseline = 'middle';
  context.textAlign = 'right';
  context.lineWidth = CURVE_WIDTH;
  LINES.forEach((line, index) => {
    const y = plot.top + LEGEND_INSET + index * LEGEND_ROW;
    const textRight = plot.right - LEGEND_INSET;
    const lineRight = textRight - context.measureText(t(line.key)).width - LEGEND_GAP;
    context.fillStyle = CURVE_COLORS.label;
    context.fillText(t(line.key), textRight, y);
    context.strokeStyle = line.color;
    context.beginPath();
    context.moveTo(lineRight - LEGEND_LINE, y);
    context.lineTo(lineRight, y);
    context.stroke();
  });
}

function paintDot(context: CanvasRenderingContext2D, plot: Plot, point: CurvePoint): void {
  context.beginPath();
  context.arc(xOfWind(plot, point.wind), yOfPower(plot, point.powerKw), DOT_RADIUS, 0, FULL_TURN);
  context.fillStyle = CURVE_COLORS.turbine;
  context.fill();
  context.strokeStyle = CURVE_COLORS.dotRing;
  context.lineWidth = DOT_RING;
  context.stroke();
}

export function paintPowerCurve(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  point: CurvePoint,
): void {
  const plot = plotOf(frame);
  paintGrid(context, frame, plot);
  paintAxisLabels(context, frame, plot);
  LINES.forEach((line) => paintLine(context, plot, line));
  paintLegend(context, frame, plot);
  paintDot(context, plot, point);
}

export class PowerCurveView {
  private readonly surface: CanvasSurface;
  private painted: CurvePoint | null = null;
  private language = '';

  constructor(canvas: HTMLCanvasElement) {
    this.surface = new CanvasSurface(canvas);
  }

  draw(point: CurvePoint): void {
    const language = currentLanguage();
    if (this.isPainted(point) && language === this.language) return;
    this.painted = { ...point };
    this.language = language;
    this.surface.paint((context, frame) => paintPowerCurve(context, frame, point));
  }

  private isPainted({ wind, powerKw }: CurvePoint): boolean {
    return this.painted?.wind === wind && this.painted.powerKw === powerKw;
  }

  dispose(): void {
    this.surface.dispose();
  }
}

export function mountPowerCurve(root: Document, store: WindFarmStore): Disposer {
  const view = new PowerCurveView(requireElement<HTMLCanvasElement>(root, POWER_CURVE_CANVAS));
  const stopWatching = watchShallowLocalized(
    store,
    (state) => {
      const { wind, heroKw } = liveReading(state);
      return [wind, heroKw] as const;
    },
    ([wind, powerKw]) => view.draw({ wind, powerKw }),
  );
  return () => {
    stopWatching();
    view.dispose();
  };
}
