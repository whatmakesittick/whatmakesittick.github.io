import { currentLanguage } from '@core/i18n';
import { CanvasSurface, canvasFont, widestText } from '@core/ui/canvasSurface';
import type { CanvasFrame } from '@core/ui/canvasSurface';
import {
  FITNESS_IDS,
  FITNESS_PROFILES,
  beatLength,
  diastoleLength,
  heartRate,
  systoleLength,
} from '../model';
import type { FitnessId } from '../model';
import { CANVAS_COLORS } from './canvasColors';
import { formatMs, formatPerMinute } from './format';

export type BeatPart = 'squeeze' | 'fill';

export interface BeatSegment {
  part: BeatPart;
  left: number;
  width: number;
  ms: number;
}

export interface BeatRow {
  top: number;
  height: number;
  rate: number;
  segments: readonly BeatSegment[];
}

const LAYOUT = {
  right: 12,
  top: 10,
  bottom: 10,
  rowGap: 12,
  font: 11,
  labelGap: 8,
  pad: 6,
} as const;
const PART_COLORS: Readonly<Record<BeatPart, string>> = {
  squeeze: CANVAS_COLORS.squeeze,
  fill: CANVAS_COLORS.fill,
};
const SEGMENT_GAP = 2;
const EVERY_RATE = FITNESS_IDS.flatMap((fitness) => {
  const { restRate, maxRate } = FITNESS_PROFILES[fitness];
  return [restRate, maxRate];
});
const LONGEST_BEAT_MS = Math.max(
  ...FITNESS_IDS.map((fitness) => beatLength(FITNESS_PROFILES[fitness].restRate)),
);

const REFERENCE_FITNESS: FitnessId = 'typical';

export function beatRates(fitness: FitnessId, effort: number): readonly number[] {
  return [FITNESS_PROFILES[REFERENCE_FITNESS].restRate, heartRate(effort, fitness)];
}

function segmentsOf(rate: number, left: number, pixelsPerMs: number): BeatSegment[] {
  const squeeze = systoleLength(rate);
  const fill = diastoleLength(rate);
  return [
    { part: 'squeeze', left, width: squeeze * pixelsPerMs, ms: squeeze },
    { part: 'fill', left: left + squeeze * pixelsPerMs, width: fill * pixelsPerMs, ms: fill },
  ];
}

export function beatSplitRows(
  width: number,
  height: number,
  gutter: number,
  rates: readonly number[],
): BeatRow[] {
  const pixelsPerMs = (width - gutter - LAYOUT.right) / LONGEST_BEAT_MS;
  const rowHeight =
    (height - LAYOUT.top - LAYOUT.bottom - LAYOUT.rowGap * (rates.length - 1)) / rates.length;
  return rates.map((rate, index) => ({
    top: LAYOUT.top + index * (rowHeight + LAYOUT.rowGap),
    height: rowHeight,
    rate,
    segments: segmentsOf(rate, gutter, pixelsPerMs),
  }));
}

function gutterOf(context: CanvasRenderingContext2D): number {
  return (
    widestText(
      context,
      EVERY_RATE.map((rate) => formatPerMinute(rate)),
    ) +
    2 * LAYOUT.labelGap
  );
}

function paintSegment(context: CanvasRenderingContext2D, row: BeatRow, segment: BeatSegment): void {
  const width = Math.max(segment.width - SEGMENT_GAP, 0);
  context.fillStyle = PART_COLORS[segment.part];
  context.fillRect(segment.left, row.top, width, row.height);
  const label = formatMs(segment.ms);
  if (context.measureText(label).width + 2 * LAYOUT.pad > width) return;
  context.fillStyle = CANVAS_COLORS.barText;
  context.fillText(label, segment.left + width / 2, row.top + row.height / 2);
}

function paintRows(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  rates: readonly number[],
): void {
  context.font = canvasFont(frame, LAYOUT.font);
  const gutter = gutterOf(context);
  context.textBaseline = 'middle';
  beatSplitRows(frame.width, frame.height, gutter, rates).forEach((row) => {
    context.textAlign = 'right';
    context.fillStyle = CANVAS_COLORS.tick;
    context.fillText(formatPerMinute(row.rate), gutter - LAYOUT.labelGap, row.top + row.height / 2);
    context.textAlign = 'center';
    row.segments.forEach((segment) => paintSegment(context, row, segment));
  });
}

export class BeatSplitView {
  private readonly surface: CanvasSurface;
  private painted = '';

  constructor(canvas: HTMLCanvasElement) {
    this.surface = new CanvasSurface(canvas);
  }

  draw(fitness: FitnessId, effort: number): void {
    const key = [fitness, effort, currentLanguage()].join('|');
    if (key === this.painted) return;
    this.painted = key;
    const rates = beatRates(fitness, effort);
    this.surface.paint((context, frame) => paintRows(context, frame, rates));
  }

  dispose(): void {
    this.surface.dispose();
  }
}
