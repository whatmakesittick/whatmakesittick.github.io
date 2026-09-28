import { currentLanguage } from '@core/i18n';
import { FULL_TURN } from '@core/math';
import {
  AM15G_SPECTRUM,
  BAND_GAP_EV,
  BAND_GAP_NM,
  SPECTRUM_END_NM,
  SPECTRUM_START_NM,
  keptShareOfPhoton,
  spectralIrradiance,
  wavelengthColor,
} from '../model';
import { CANVAS_COLORS, rgbCss } from './canvasColors';
import { CanvasSurface, canvasFont } from './canvasSurface';
import type { CanvasFrame } from './canvasSurface';
import { formatElectronVolts, formatNanometres } from './format';

interface Plot {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface Labels {
  gap: string;
  ticks: string[];
}

const LAYOUT = {
  side: 12,
  top: 26,
  strip: 6,
  stripGap: 4,
  labelGap: 6,
  labelHeight: 14,
  font: 11,
} as const;
const SLICE_NM = 2;
const TICKS_NM = [400, 700, 1000, 1300] as const;
const HEADROOM = 1.08;
const PEAK_IRRADIANCE = Math.max(...AM15G_SPECTRUM) * HEADROOM;
const LINE = { gap: 1, marker: 2 } as const;
const GAP_DASH = [4, 3];
const MARKER = { radius: 4.5, ring: 1.5 } as const;
const KEY_SEPARATOR = '|';

function plotOf(frame: CanvasFrame): Plot {
  return {
    left: LAYOUT.side,
    right: frame.width - LAYOUT.side,
    top: LAYOUT.top,
    bottom: frame.height - LAYOUT.strip - LAYOUT.stripGap - LAYOUT.labelGap - LAYOUT.labelHeight,
  };
}

function xOf(plot: Plot, nanometres: number): number {
  const share = (nanometres - SPECTRUM_START_NM) / (SPECTRUM_END_NM - SPECTRUM_START_NM);
  return plot.left + (plot.right - plot.left) * share;
}

function yOf(plot: Plot, irradiance: number): number {
  return plot.bottom - ((plot.bottom - plot.top) * irradiance) / PEAK_IRRADIANCE;
}

function labelsNow(): Labels {
  return {
    gap: formatElectronVolts(BAND_GAP_EV),
    ticks: TICKS_NM.map((nanometres) => formatNanometres(nanometres)),
  };
}

function paintSlice(context: CanvasRenderingContext2D, plot: Plot, nanometres: number): void {
  const left = xOf(plot, nanometres);
  const width = xOf(plot, nanometres + SLICE_NM) - left;
  const irradiance = spectralIrradiance(nanometres);
  const kept = keptShareOfPhoton(nanometres + SLICE_NM / 2);
  if (kept === 0) {
    context.fillStyle = CANVAS_COLORS.weak;
    context.fillRect(left, yOf(plot, irradiance), width, plot.bottom - yOf(plot, irradiance));
    return;
  }
  const usableTop = yOf(plot, irradiance * kept);
  context.fillStyle = CANVAS_COLORS.usable;
  context.fillRect(left, usableTop, width, plot.bottom - usableTop);
  context.fillStyle = CANVAS_COLORS.heat;
  context.fillRect(left, yOf(plot, irradiance), width, usableTop - yOf(plot, irradiance));
}

function paintSpectrum(context: CanvasRenderingContext2D, plot: Plot): void {
  for (let nanometres = SPECTRUM_START_NM; nanometres < SPECTRUM_END_NM; nanometres += SLICE_NM) {
    paintSlice(context, plot, nanometres);
  }
}

function paintStrip(context: CanvasRenderingContext2D, plot: Plot): void {
  const top = plot.bottom + LAYOUT.stripGap;
  for (let nanometres = SPECTRUM_START_NM; nanometres < SPECTRUM_END_NM; nanometres += SLICE_NM) {
    const left = xOf(plot, nanometres);
    context.fillStyle = rgbCss(wavelengthColor(nanometres));
    context.fillRect(left, top, xOf(plot, nanometres + SLICE_NM) - left, LAYOUT.strip);
  }
}

function paintTicks(context: CanvasRenderingContext2D, plot: Plot, labels: Labels): void {
  const baseline = plot.bottom + LAYOUT.stripGap + LAYOUT.strip + LAYOUT.labelGap;
  context.textBaseline = 'top';
  context.textAlign = 'center';
  context.fillStyle = CANVAS_COLORS.tick;
  TICKS_NM.forEach((nanometres, index) => {
    context.fillText(labels.ticks[index], xOf(plot, nanometres), baseline);
  });
}

function paintGap(context: CanvasRenderingContext2D, plot: Plot, labels: Labels): void {
  const x = xOf(plot, BAND_GAP_NM);
  context.strokeStyle = CANVAS_COLORS.gap;
  context.lineWidth = LINE.gap;
  context.setLineDash(GAP_DASH);
  context.beginPath();
  context.moveTo(x, plot.top);
  context.lineTo(x, plot.bottom);
  context.stroke();
  context.setLineDash([]);
  context.textBaseline = 'bottom';
  context.textAlign = 'center';
  context.fillStyle = CANVAS_COLORS.lit;
  context.fillText(labels.gap, x, plot.top - LAYOUT.labelGap / 2);
}

function paintBackdrop(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  plot: Plot,
  labels: Labels,
): void {
  context.font = canvasFont(frame, LAYOUT.font);
  context.strokeStyle = CANVAS_COLORS.axis;
  context.lineWidth = LINE.gap;
  context.strokeRect(plot.left, plot.bottom, plot.right - plot.left, 0);
  paintSpectrum(context, plot);
  paintStrip(context, plot);
  paintTicks(context, plot, labels);
  paintGap(context, plot, labels);
}

function paintMarker(context: CanvasRenderingContext2D, plot: Plot, nanometres: number): void {
  const x = xOf(plot, Math.min(nanometres, SPECTRUM_END_NM - SLICE_NM));
  const y = yOf(plot, spectralIrradiance(nanometres));
  const color = rgbCss(wavelengthColor(nanometres));
  context.strokeStyle = CANVAS_COLORS.markerLine;
  context.lineWidth = LINE.marker;
  context.beginPath();
  context.moveTo(x, plot.bottom + LAYOUT.stripGap + LAYOUT.strip);
  context.lineTo(x, y);
  context.stroke();
  context.beginPath();
  context.arc(x, y, MARKER.radius, 0, FULL_TURN);
  context.fillStyle = color;
  context.fill();
  context.lineWidth = MARKER.ring;
  context.strokeStyle = CANVAS_COLORS.lit;
  context.stroke();
}

function backdropKey(frame: CanvasFrame, labels: Labels): string {
  return [
    frame.width,
    frame.height,
    frame.ratio,
    frame.fontFamily,
    labels.gap,
    ...labels.ticks,
  ].join(KEY_SEPARATOR);
}

class Backdrop {
  private readonly canvas = document.createElement('canvas');
  private key = '';

  invalidate(): void {
    this.key = '';
  }

  draw(context: CanvasRenderingContext2D, frame: CanvasFrame, plot: Plot, labels: Labels): void {
    const key = backdropKey(frame, labels);
    if (key !== this.key) this.render(frame, plot, labels, key);
    context.drawImage(this.canvas, 0, 0, frame.width, frame.height);
  }

  private render(frame: CanvasFrame, plot: Plot, labels: Labels, key: string): void {
    this.canvas.width = Math.round(frame.width * frame.ratio);
    this.canvas.height = Math.round(frame.height * frame.ratio);
    const context = this.canvas.getContext('2d');
    if (!context) return;
    context.setTransform(frame.ratio, 0, 0, frame.ratio, 0, 0);
    paintBackdrop(context, frame, plot, labels);
    this.key = key;
  }
}

export class SpectrumView {
  private readonly surface: CanvasSurface;
  private readonly backdrop = new Backdrop();
  private painted: number | null = null;
  private language = '';

  constructor(canvas: HTMLCanvasElement) {
    this.surface = new CanvasSurface(canvas, { onFontsReady: () => this.backdrop.invalidate() });
  }

  draw(wavelengthNm: number): void {
    const language = currentLanguage();
    if (this.painted === wavelengthNm && language === this.language) return;
    this.painted = wavelengthNm;
    this.language = language;
    this.surface.paint((context, frame) => {
      const plot = plotOf(frame);
      this.backdrop.draw(context, frame, plot, labelsNow());
      paintMarker(context, plot, wavelengthNm);
    });
  }

  dispose(): void {
    this.surface.dispose();
  }
}
