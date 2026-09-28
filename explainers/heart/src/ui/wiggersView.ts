import { currentLanguage } from '@core/i18n';
import { PHASE_IDS } from '../ids';
import {
  END_DIASTOLIC_ML,
  END_SYSTOLIC_ML,
  PHASE_RANGES,
  aorticPressure,
  leftAtrialPressure,
  leftVentriclePressure,
  leftVentricleVolume,
} from '../model';
import type { Curve } from '../model';
import {
  paintCursor,
  paintDot,
  paintTimeTicks,
  sampleBeat,
  strokeBeat,
  timeTickLabels,
  xOfTime,
  yOfValue,
} from './beatPlot';
import type { BeatSample, Plot, Scale } from './beatPlot';
import { CachedLayer, layerKey } from './cachedLayer';
import { CANVAS_COLORS, PHASE_COLORS } from './canvasColors';
import { CanvasSurface, canvasFont, widestText } from './canvasSurface';
import type { CanvasFrame } from './canvasSurface';
import { formatMl, formatMmHg } from './format';

export interface WiggersLayout {
  strip: Plot;
  pressure: Plot;
  volume: Plot;
  axisBaseline: number;
}

interface Labels {
  pressure: string[];
  volume: string[];
  time: string[];
}

interface Trace {
  samples: readonly BeatSample[];
  curve: Curve;
  color: string;
  width: number;
}

const PRESSURE_SCALE: Scale = { min: 0, max: 140 };
const PRESSURE_TICKS = [0, 40, 80, 120] as const;
const VOLUME_SCALE: Scale = { min: 35, max: 135 };
const VOLUME_TICKS = [END_SYSTOLIC_ML, END_DIASTOLIC_ML] as const;
const SAMPLE_STEP_MS = 2;
const LAYOUT = {
  right: 12,
  top: 2,
  strip: 5,
  stripGap: 10,
  panelGap: 16,
  bottom: 22,
  font: 11,
  tickGap: 6,
  pressureShare: 0.64,
} as const;
const GRID_WIDTH = 1;

function trace(curve: Curve, color: string, width: number): Trace {
  return { samples: sampleBeat(curve, SAMPLE_STEP_MS), curve, color, width };
}

const PRESSURE_TRACES: readonly Trace[] = [
  trace(leftAtrialPressure, CANVAS_COLORS.atrium, 1.6),
  trace(aorticPressure, CANVAS_COLORS.aorta, 1.8),
  trace(leftVentriclePressure, CANVAS_COLORS.ventricle, 2.4),
];

const VOLUME_TRACE = trace(leftVentricleVolume, CANVAS_COLORS.volume, 2.2);

export function wiggersLayout(width: number, height: number, gutter: number): WiggersLayout {
  const left = gutter;
  const right = width - LAYOUT.right;
  const strip = { left, right, top: LAYOUT.top, bottom: LAYOUT.top + LAYOUT.strip };
  const plotsTop = strip.bottom + LAYOUT.stripGap;
  const plotsBottom = height - LAYOUT.bottom;
  const pressureBottom =
    plotsTop + (plotsBottom - plotsTop - LAYOUT.panelGap) * LAYOUT.pressureShare;
  return {
    strip,
    pressure: { left, right, top: plotsTop, bottom: pressureBottom },
    volume: { left, right, top: pressureBottom + LAYOUT.panelGap, bottom: plotsBottom },
    axisBaseline: plotsBottom + LAYOUT.tickGap,
  };
}

function labelsNow(): Labels {
  return {
    pressure: PRESSURE_TICKS.map((mmHg) => formatMmHg(mmHg)),
    volume: VOLUME_TICKS.map((millilitres) => formatMl(millilitres)),
    time: timeTickLabels(),
  };
}

function gutterOf(context: CanvasRenderingContext2D, labels: Labels): number {
  return widestText(context, [...labels.pressure, ...labels.volume]) + 2 * LAYOUT.tickGap;
}

function paintStrip(context: CanvasRenderingContext2D, strip: Plot): void {
  PHASE_IDS.forEach((id) => {
    const { start, end } = PHASE_RANGES[id];
    const left = xOfTime(strip, start);
    context.fillStyle = PHASE_COLORS[id];
    context.fillRect(left, strip.top, xOfTime(strip, end) - left, strip.bottom - strip.top);
  });
}

function paintValueGrid(
  context: CanvasRenderingContext2D,
  plot: Plot,
  scale: Scale,
  ticks: readonly number[],
  labels: readonly string[],
): void {
  context.lineWidth = GRID_WIDTH;
  context.strokeStyle = CANVAS_COLORS.grid;
  context.fillStyle = CANVAS_COLORS.tick;
  context.textAlign = 'right';
  context.textBaseline = 'middle';
  ticks.forEach((value, index) => {
    const y = yOfValue(plot, value, scale);
    context.strokeRect(plot.left, y, plot.right - plot.left, 0);
    context.fillText(labels[index], plot.left - LAYOUT.tickGap, y);
  });
  context.strokeStyle = CANVAS_COLORS.axis;
  context.strokeRect(plot.left, plot.bottom, plot.right - plot.left, 0);
}

function paintBackdrop(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  layout: WiggersLayout,
  labels: Labels,
): void {
  context.font = canvasFont(frame, LAYOUT.font);
  paintStrip(context, layout.strip);
  paintValueGrid(context, layout.pressure, PRESSURE_SCALE, PRESSURE_TICKS, labels.pressure);
  paintValueGrid(context, layout.volume, VOLUME_SCALE, VOLUME_TICKS, labels.volume);
  paintTimeTicks(context, layout.volume, layout.axisBaseline, labels.time);
  PRESSURE_TRACES.forEach((line) =>
    strokeBeat(context, layout.pressure, line.samples, PRESSURE_SCALE, line),
  );
  strokeBeat(context, layout.volume, VOLUME_TRACE.samples, VOLUME_SCALE, VOLUME_TRACE);
}

function paintNow(context: CanvasRenderingContext2D, layout: WiggersLayout, time: number): void {
  const x = xOfTime(layout.pressure, time);
  paintCursor(context, x, layout.pressure.top, layout.volume.bottom);
  PRESSURE_TRACES.forEach(({ curve, color }) =>
    paintDot(context, x, yOfValue(layout.pressure, curve(time), PRESSURE_SCALE), color),
  );
  const volumeY = yOfValue(layout.volume, VOLUME_TRACE.curve(time), VOLUME_SCALE);
  paintDot(context, x, volumeY, VOLUME_TRACE.color);
}

export class WiggersView {
  private readonly surface: CanvasSurface;
  private readonly backdrop = new CachedLayer();
  private painted: number | null = null;
  private language = '';

  constructor(canvas: HTMLCanvasElement) {
    this.surface = new CanvasSurface(canvas, { onFontsReady: () => this.backdrop.invalidate() });
  }

  draw(time: number): void {
    const language = currentLanguage();
    if (this.painted === time && language === this.language) return;
    this.painted = time;
    this.language = language;
    this.surface.paint((context, frame) => {
      const labels = labelsNow();
      context.font = canvasFont(frame, LAYOUT.font);
      const layout = wiggersLayout(frame.width, frame.height, gutterOf(context, labels));
      const key = layerKey(frame, [...labels.pressure, ...labels.volume, ...labels.time]);
      this.backdrop.draw(context, frame, key, (layer) =>
        paintBackdrop(layer, frame, layout, labels),
      );
      paintNow(context, layout, time);
    });
  }

  dispose(): void {
    this.surface.dispose();
  }
}
