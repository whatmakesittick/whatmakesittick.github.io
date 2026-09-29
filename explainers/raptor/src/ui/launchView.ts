import { currentLanguage } from '@core/i18n';
import { FULL_TURN } from '@core/math';
import { CanvasSurface, canvasFont, widestText } from '@core/ui/canvasSurface';
import type { CanvasFrame } from '@core/ui/canvasSurface';
import { PHASE_IDS } from '../ids';
import { CUTOFF_TIME, RUN_LENGTH, engineState, phaseAt, speedKmh } from '../model';
import { PHASE_RANGES } from '../model/phases';
import { thrustTf } from '../model/performance';
import { CachedLayer, layerKey } from './cachedLayer';
import { CANVAS_COLORS, PHASE_COLORS } from './canvasColors';
import { formatFlightTime, formatKm, formatTonnes } from './format';
import { ALTITUDE_FULL_SCALE_KM, THRUST_FULL_SCALE_TF } from './readouts';

export interface Plot {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface LaunchLayout {
  plot: Plot;
  strip: Plot;
  axisBaseline: number;
}

export type LaunchCurve = (phase: number) => number;

interface Trace {
  curve: LaunchCurve;
  max: number;
  color: string;
  width: number;
  samples: readonly number[];
}

interface Labels {
  thrust: string[];
  height: string[];
  time: string[];
}

const SAMPLE_STEP = 0.5;
const SPEED_FULL_SCALE_KMH = speedKmh(CUTOFF_TIME);
const THRUST_TICKS = [0, THRUST_FULL_SCALE_TF / 2, THRUST_FULL_SCALE_TF] as const;
const HEIGHT_TICKS = [0, ALTITUDE_FULL_SCALE_KM / 2, ALTITUDE_FULL_SCALE_KM] as const;
const TIME_TICKS_SECONDS = [0, 60, 120] as const;
const WHOLE = 0;
const LAYOUT = {
  top: 8,
  stripGap: 6,
  strip: 5,
  tickGap: 6,
  bottom: 20,
  font: 11,
} as const;
const LINE = { grid: 1, thrust: 2.4, height: 2, speed: 1.6, cursor: 1.5 } as const;
const DOT = { radius: 3.5, ring: 1.2 } as const;

function sample(curve: LaunchCurve): number[] {
  const samples: number[] = [];
  for (let phase = 0; phase < RUN_LENGTH; phase += SAMPLE_STEP) samples.push(curve(phase));
  samples.push(curve(RUN_LENGTH));
  return samples;
}

function trace(curve: LaunchCurve, max: number, color: string, width: number): Trace {
  return { curve, max, color, width, samples: sample(curve) };
}

export const launchThrust: LaunchCurve = (phase) => {
  const { throttle, airPressurePa } = engineState(phase);
  return thrustTf(throttle, airPressurePa);
};

export const launchHeight: LaunchCurve = (phase) => engineState(phase).altitudeKm;

export const launchSpeed: LaunchCurve = (phase) => engineState(phase).speedKmh;

function launchTraces(): readonly Trace[] {
  return [
    trace(launchSpeed, SPEED_FULL_SCALE_KMH, CANVAS_COLORS.speed, LINE.speed),
    trace(launchHeight, ALTITUDE_FULL_SCALE_KM, CANVAS_COLORS.height, LINE.height),
    trace(launchThrust, THRUST_FULL_SCALE_TF, CANVAS_COLORS.thrust, LINE.thrust),
  ];
}

export function xOfPhase(plot: Plot, phase: number): number {
  return plot.left + ((plot.right - plot.left) * phase) / RUN_LENGTH;
}

export function yOfShare(plot: Plot, share: number): number {
  return plot.bottom - (plot.bottom - plot.top) * share;
}

export function launchLayout(
  width: number,
  height: number,
  leftGutter: number,
  rightGutter: number,
): LaunchLayout {
  const left = leftGutter;
  const right = width - rightGutter;
  const stripBottom = height - LAYOUT.bottom;
  const stripTop = stripBottom - LAYOUT.strip;
  return {
    plot: { left, right, top: LAYOUT.top, bottom: stripTop - LAYOUT.stripGap },
    strip: { left, right, top: stripTop, bottom: stripBottom },
    axisBaseline: stripBottom + LAYOUT.tickGap,
  };
}

function labelsNow(): Labels {
  return {
    thrust: THRUST_TICKS.map((tonnes) => formatTonnes(tonnes)),
    height: HEIGHT_TICKS.map((km) => formatKm(km, WHOLE)),
    time: TIME_TICKS_SECONDS.map((seconds) => formatFlightTime(seconds)),
  };
}

function gutter(context: CanvasRenderingContext2D, labels: readonly string[]): number {
  return widestText(context, labels) + 2 * LAYOUT.tickGap;
}

function paintStrip(context: CanvasRenderingContext2D, strip: Plot): void {
  PHASE_IDS.forEach((id) => {
    const { start, end } = PHASE_RANGES[id];
    const left = xOfPhase(strip, start);
    context.fillStyle = PHASE_COLORS[id];
    context.fillRect(left, strip.top, xOfPhase(strip, end) - left, strip.bottom - strip.top);
  });
}

function paintValueTicks(context: CanvasRenderingContext2D, plot: Plot, labels: Labels): void {
  context.lineWidth = LINE.grid;
  context.textBaseline = 'middle';
  THRUST_TICKS.forEach((tonnes, index) => {
    const y = yOfShare(plot, tonnes / THRUST_FULL_SCALE_TF);
    context.strokeStyle = index === 0 ? CANVAS_COLORS.axis : CANVAS_COLORS.grid;
    context.strokeRect(plot.left, y, plot.right - plot.left, 0);
    context.fillStyle = CANVAS_COLORS.thrust;
    context.textAlign = 'right';
    context.fillText(labels.thrust[index], plot.left - LAYOUT.tickGap, y);
    context.fillStyle = CANVAS_COLORS.height;
    context.textAlign = 'left';
    context.fillText(labels.height[index], plot.right + LAYOUT.tickGap, y);
  });
}

function paintTimeTicks(
  context: CanvasRenderingContext2D,
  plot: Plot,
  baseline: number,
  labels: Labels,
): void {
  context.fillStyle = CANVAS_COLORS.tick;
  context.textAlign = 'center';
  context.textBaseline = 'top';
  TIME_TICKS_SECONDS.forEach((seconds, index) => {
    context.fillText(labels.time[index], xOfPhase(plot, phaseAt(seconds)), baseline);
  });
}

function strokeTrace(context: CanvasRenderingContext2D, plot: Plot, line: Trace): void {
  context.beginPath();
  line.samples.forEach((value, index) => {
    const x = xOfPhase(plot, Math.min(index * SAMPLE_STEP, RUN_LENGTH));
    const y = yOfShare(plot, value / line.max);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.strokeStyle = line.color;
  context.lineWidth = line.width;
  context.lineJoin = 'round';
  context.stroke();
}

function paintBackdrop(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  layout: LaunchLayout,
  labels: Labels,
  traces: readonly Trace[],
): void {
  context.font = canvasFont(frame, LAYOUT.font);
  paintStrip(context, layout.strip);
  paintValueTicks(context, layout.plot, labels);
  paintTimeTicks(context, layout.plot, layout.axisBaseline, labels);
  traces.forEach((line) => strokeTrace(context, layout.plot, line));
}

function paintDot(context: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  context.beginPath();
  context.arc(x, y, DOT.radius, 0, FULL_TURN);
  context.fillStyle = color;
  context.fill();
  context.lineWidth = DOT.ring;
  context.strokeStyle = CANVAS_COLORS.lit;
  context.stroke();
}

function paintNow(
  context: CanvasRenderingContext2D,
  layout: LaunchLayout,
  traces: readonly Trace[],
  phase: number,
): void {
  const { plot } = layout;
  const x = xOfPhase(plot, phase);
  context.strokeStyle = CANVAS_COLORS.cursor;
  context.lineWidth = LINE.cursor;
  context.beginPath();
  context.moveTo(x, plot.top);
  context.lineTo(x, layout.strip.bottom);
  context.stroke();
  traces.forEach(({ curve, max, color }) =>
    paintDot(context, x, yOfShare(plot, curve(phase) / max), color),
  );
}

interface CachedLayout {
  key: string;
  layout: LaunchLayout;
}

export class LaunchView {
  private readonly surface: CanvasSurface;
  private readonly backdrop = new CachedLayer();
  private tracesCache: readonly Trace[] | null = null;
  private layoutCache: CachedLayout | null = null;
  private painted: number | null = null;
  private language = currentLanguage();
  private labels = labelsNow();

  constructor(canvas: HTMLCanvasElement) {
    this.surface = new CanvasSurface(canvas, { onFontsReady: () => this.invalidate() });
  }

  draw(phase: number): void {
    const language = currentLanguage();
    if (this.painted === phase && language === this.language) return;
    if (language !== this.language) this.labels = labelsNow();
    this.painted = phase;
    this.language = language;
    this.surface.paint((context, frame) => {
      const traces = this.traces();
      const { key, layout } = this.layoutFor(context, frame);
      this.backdrop.draw(context, frame, key, (layer) =>
        paintBackdrop(layer, frame, layout, this.labels, traces),
      );
      paintNow(context, layout, traces, phase);
    });
  }

  dispose(): void {
    this.surface.dispose();
  }

  private invalidate(): void {
    this.backdrop.invalidate();
    this.layoutCache = null;
  }

  private traces(): readonly Trace[] {
    this.tracesCache ??= launchTraces();
    return this.tracesCache;
  }

  private layoutFor(context: CanvasRenderingContext2D, frame: CanvasFrame): CachedLayout {
    const { labels } = this;
    const key = layerKey(frame, [...labels.thrust, ...labels.height, ...labels.time]);
    if (this.layoutCache?.key === key) return this.layoutCache;
    context.font = canvasFont(frame, LAYOUT.font);
    const layout = launchLayout(
      frame.width,
      frame.height,
      gutter(context, labels.thrust),
      gutter(context, labels.height),
    );
    this.layoutCache = { key, layout };
    return this.layoutCache;
  }
}
