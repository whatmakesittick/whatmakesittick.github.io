import { currentLanguage, t } from '@core/i18n';
import { WAVE_IDS } from '../ids';
import type { WaveId } from '../ids';
import { BEAT_MS, P_WAVE, QRS, T_WAVE, WAVE_MOMENTS, ecgMillivolts } from '../model';
import type { Span } from '../model';
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
import type { Plot, Scale } from './beatPlot';
import { CachedLayer, layerKey } from './cachedLayer';
import { CANVAS_COLORS, WAVE_BANDS } from './canvasColors';
import { CanvasSurface, canvasFont } from './canvasSurface';
import type { CanvasFrame } from './canvasSurface';

export interface EcgLayout {
  plot: Plot;
  waveBaseline: number;
  axisBaseline: number;
}

interface Labels {
  waves: string[];
  time: string[];
}

const MILLIVOLT_SCALE: Scale = { min: -0.45, max: 1.35 };
const MINOR_GRID_MS = 40;
const MAJOR_GRID_MS = 200;
const MINOR_GRID_MV = 0.1;
const MAJOR_GRID_EVERY = 5;
const SAMPLE_STEP_MS = 1;
const LAYOUT = { side: 12, top: 20, bottom: 22, font: 11, tickGap: 6, waveGap: 6 } as const;
const LINE = { grid: 1, trace: 2 } as const;
const TRACE_SAMPLES = sampleBeat(ecgMillivolts, SAMPLE_STEP_MS);
const WAVE_SPANS: Readonly<Record<WaveId, Span>> = { p: P_WAVE, qrs: QRS, t: T_WAVE };

export function ecgLayout(width: number, height: number): EcgLayout {
  const plot = {
    left: LAYOUT.side,
    right: width - LAYOUT.side,
    top: LAYOUT.top,
    bottom: height - LAYOUT.bottom,
  };
  return {
    plot,
    waveBaseline: plot.top - LAYOUT.waveGap / 2,
    axisBaseline: plot.bottom + LAYOUT.tickGap,
  };
}

export function waveLabelX(plot: Plot, wave: WaveId, labelWidth: number): number {
  const half = labelWidth / 2;
  return Math.min(Math.max(xOfTime(plot, WAVE_MOMENTS[wave]), plot.left + half), plot.right - half);
}

function labelsNow(): Labels {
  return {
    waves: WAVE_IDS.map((wave) => t(`controls.waveOptions.${wave}`)),
    time: timeTickLabels(),
  };
}

function millivoltLines(): number[] {
  const lines: number[] = [];
  const first = Math.ceil(MILLIVOLT_SCALE.min / MINOR_GRID_MV);
  const last = Math.floor(MILLIVOLT_SCALE.max / MINOR_GRID_MV);
  for (let step = first; step <= last; step += 1) lines.push(step);
  return lines;
}

function paintPaper(context: CanvasRenderingContext2D, plot: Plot): void {
  context.lineWidth = LINE.grid;
  for (let time = 0; time <= BEAT_MS; time += MINOR_GRID_MS) {
    context.strokeStyle = time % MAJOR_GRID_MS === 0 ? CANVAS_COLORS.gridMajor : CANVAS_COLORS.grid;
    context.strokeRect(xOfTime(plot, time), plot.top, 0, plot.bottom - plot.top);
  }
  millivoltLines().forEach((step) => {
    const y = yOfValue(plot, step * MINOR_GRID_MV, MILLIVOLT_SCALE);
    context.strokeStyle =
      step % MAJOR_GRID_EVERY === 0 ? CANVAS_COLORS.gridMajor : CANVAS_COLORS.grid;
    context.strokeRect(plot.left, y, plot.right - plot.left, 0);
  });
}

function paintWaves(context: CanvasRenderingContext2D, layout: EcgLayout, labels: Labels): void {
  const { plot } = layout;
  context.textAlign = 'center';
  context.textBaseline = 'bottom';
  WAVE_IDS.forEach((wave, index) => {
    const { start, end } = WAVE_SPANS[wave];
    const left = xOfTime(plot, start);
    context.fillStyle = WAVE_BANDS[wave];
    context.fillRect(left, plot.top, xOfTime(plot, end) - left, plot.bottom - plot.top);
    const label = labels.waves[index];
    context.fillStyle = CANVAS_COLORS.lit;
    const x = waveLabelX(plot, wave, context.measureText(label).width);
    context.fillText(label, x, layout.waveBaseline);
  });
}

function paintBackdrop(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  layout: EcgLayout,
  labels: Labels,
): void {
  context.font = canvasFont(frame, LAYOUT.font);
  paintPaper(context, layout.plot);
  paintWaves(context, layout, labels);
  paintTimeTicks(context, layout.plot, layout.axisBaseline, labels.time);
  strokeBeat(context, layout.plot, TRACE_SAMPLES, MILLIVOLT_SCALE, {
    color: CANVAS_COLORS.trace,
    width: LINE.trace,
  });
}

function paintNow(context: CanvasRenderingContext2D, plot: Plot, time: number): void {
  const x = xOfTime(plot, time);
  paintCursor(context, x, plot.top, plot.bottom);
  paintDot(context, x, yOfValue(plot, ecgMillivolts(time), MILLIVOLT_SCALE), CANVAS_COLORS.trace);
}

export class EcgView {
  private readonly surface: CanvasSurface;
  private readonly backdrop = new CachedLayer();
  private painted: number | null = null;
  private language = currentLanguage();
  private labels = labelsNow();

  constructor(canvas: HTMLCanvasElement) {
    this.surface = new CanvasSurface(canvas, { onFontsReady: () => this.backdrop.invalidate() });
  }

  draw(time: number): void {
    const language = currentLanguage();
    if (this.painted === time && language === this.language) return;
    if (language !== this.language) this.labels = labelsNow();
    this.painted = time;
    this.language = language;
    const { labels } = this;
    this.surface.paint((context, frame) => {
      const layout = ecgLayout(frame.width, frame.height);
      const key = layerKey(frame, [...labels.waves, ...labels.time]);
      this.backdrop.draw(context, frame, key, (layer) =>
        paintBackdrop(layer, frame, layout, labels),
      );
      paintNow(context, layout.plot, time);
    });
  }

  dispose(): void {
    this.surface.dispose();
  }
}
