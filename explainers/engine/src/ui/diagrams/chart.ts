import { html, svg } from '@core/ui/dom';
import { CYCLE_DEGREES, STROKES, STROKE_DEGREES, STROKE_START } from '../../model';
import type { Point2 } from '../../model';
import { deadCentreLabel, formatDegrees, strokeLabel } from '../format';
import type { DeadCentre } from '../format';
import { STROKE_COLORS } from '../palette';

export type Domain = readonly [number, number];
export type Scale = (value: number) => number;

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Guide {
  value: number;
  label: string;
  detail?: string;
}

export interface Cursor {
  element: SVGGElement;
  moveTo(x: number): void;
}

export interface LegendItem {
  label: string;
  color: string;
  dashed?: boolean;
  muted?: boolean;
}

const COORDINATE_DIGITS = 1;
const CHARACTER_WIDTH = 6.2;
const LABEL_BREATHING_ROOM = 8;
const GUIDE_LABEL_OFFSET = 16;
const GUIDE_DETAIL_OFFSET = 13;
const TICK_LABEL_GAP = 8;
const NICE_STEPS = [1, 2, 2.5, 5, 10];
const DEAD_CENTRE_SEQUENCE: readonly DeadCentre[] = ['top', 'bottom'];

export function linearScale(domain: Domain, range: Domain): Scale {
  const [domainStart, domainEnd] = domain;
  const [rangeStart, rangeEnd] = range;
  const ratio = (rangeEnd - rangeStart) / (domainEnd - domainStart);
  return (value) => rangeStart + (value - domainStart) * ratio;
}

export function sampleCurve(
  domain: Domain,
  step: number,
  valueAt: (input: number) => number,
  x: Scale,
  y: Scale,
): Point2[] {
  const points: Point2[] = [];
  for (let input = domain[0]; input <= domain[1]; input += step) {
    points.push({ x: x(input), y: y(valueAt(input)) });
  }
  return points;
}

function formatPoint(point: Point2): string {
  return `${point.x.toFixed(COORDINATE_DIGITS)},${point.y.toFixed(COORDINATE_DIGITS)}`;
}

export function linePath(points: Point2[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${formatPoint(point)}`).join('');
}

export function areaPath(points: Point2[], baseline: number): string {
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)}L${last.x},${baseline}L${first.x},${baseline}Z`;
}

export function textFits(text: string, width: number): boolean {
  return text.length * CHARACTER_WIDTH + LABEL_BREATHING_ROOM <= width;
}

export function createChart(width: number, height: number, label: string): SVGSVGElement {
  return svg('svg', {
    class: 'chart',
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': label,
  });
}

export function chartText(
  text: string,
  attributes: Record<string, string | number>,
  className = 'chart-text',
): SVGTextElement {
  const { fill, ...rest } = attributes;
  const style = fill === undefined ? undefined : `fill: ${fill}`;
  return svg('text', { class: className, ...rest, style }, [text]);
}

export interface StrokeBandOptions {
  x: Scale;
  domain: Domain;
  top: number;
  height: number;
  opacity: number;
  labels?: boolean;
}

function strokeBand(options: StrokeBandOptions, stroke: (typeof STROKES)[number], start: number) {
  const { x, domain, top, height, opacity, labels } = options;
  const from = Math.max(start, domain[0]);
  const to = Math.min(start + STROKE_DEGREES, domain[1]);
  if (to <= from) return [];
  const inMainCycle = start >= 0 && start < CYCLE_DEGREES;
  const band = svg('rect', {
    x: x(from),
    y: top,
    width: x(to) - x(from),
    height,
    fill: STROKE_COLORS[stroke],
    opacity: inMainCycle ? opacity : opacity / 2,
  });
  const name = strokeLabel(stroke);
  if (!labels || !inMainCycle || !textFits(name, x(to) - x(from))) return [band];
  const label = chartText(
    name,
    { x: (x(from) + x(to)) / 2, y: top + height / 2, fill: STROKE_COLORS[stroke] },
    'chart-stroke-label',
  );
  return [band, label];
}

export function strokeBands(options: StrokeBandOptions): SVGGElement {
  const firstCycle = Math.floor(options.domain[0] / CYCLE_DEGREES);
  const lastCycle = Math.floor(options.domain[1] / CYCLE_DEGREES);
  const group = svg('g', { class: 'chart-strokes' });
  for (let cycle = firstCycle; cycle <= lastCycle; cycle += 1) {
    for (const stroke of STROKES) {
      group.append(...strokeBand(options, stroke, STROKE_START[stroke] + cycle * CYCLE_DEGREES));
    }
  }
  return group;
}

export function deadCentreGuides(domain: Domain): Guide[] {
  const guides: Guide[] = [];
  const first = Math.ceil(domain[0] / STROKE_DEGREES);
  const last = Math.floor(domain[1] / STROKE_DEGREES);
  for (let index = first; index <= last; index += 1) {
    const value = index * STROKE_DEGREES;
    guides.push({
      value,
      label: deadCentreLabel(DEAD_CENTRE_SEQUENCE[Math.abs(index) % 2]),
      detail: formatDegrees(value),
    });
  }
  return guides;
}

export function verticalGuides(
  guides: Guide[],
  x: Scale,
  top: number,
  bottom: number,
): SVGGElement {
  const group = svg('g', { class: 'chart-guides' });
  for (const guide of guides) {
    const position = x(guide.value);
    group.append(
      svg('line', { class: 'chart-grid', x1: position, x2: position, y1: top, y2: bottom }),
      chartText(guide.label, { x: position, y: bottom + GUIDE_LABEL_OFFSET }, 'chart-axis-label'),
    );
    if (guide.detail) {
      const detailY = bottom + GUIDE_LABEL_OFFSET + GUIDE_DETAIL_OFFSET;
      group.append(chartText(guide.detail, { x: position, y: detailY }, 'chart-axis-detail'));
    }
  }
  return group;
}

export function niceTicks(maximum: number, targetCount: number): number[] {
  const roughStep = maximum / targetCount;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = magnitude * (NICE_STEPS.find((nice) => nice * magnitude >= roughStep) ?? 10);
  const ticks: number[] = [];
  for (let value = 0; value <= maximum + step / 2; value += step) ticks.push(value);
  return ticks;
}

export function horizontalTicks(
  ticks: number[],
  y: Scale,
  left: number,
  right: number,
  format: (value: number) => string,
): SVGGElement {
  const group = svg('g', { class: 'chart-ticks' });
  for (const tick of ticks) {
    const position = y(tick);
    group.append(
      svg('line', {
        class: 'chart-grid chart-grid-soft',
        x1: left,
        x2: right,
        y1: position,
        y2: position,
      }),
      chartText(format(tick), { x: left - TICK_LABEL_GAP, y: position }, 'chart-tick-label'),
    );
  }
  return group;
}

export function createCursor(top: number, bottom: number, markers: SVGElement[] = []): Cursor {
  const element = svg('g', { class: 'chart-cursor' }, [
    svg('line', { x1: 0, x2: 0, y1: top, y2: bottom }),
    ...markers,
  ]);
  return {
    element,
    moveTo: (x) =>
      element.setAttribute('transform', `translate(${x.toFixed(COORDINATE_DIGITS)} 0)`),
  };
}

export function legend(items: LegendItem[]): HTMLUListElement {
  return html(
    'ul',
    { class: 'chart-legend' },
    items.map((item) =>
      html('li', { 'data-dashed': item.dashed, 'data-muted': item.muted }, [
        html('span', { class: 'chart-legend-swatch', style: `--swatch: ${item.color}` }),
        item.label,
      ]),
    ),
  );
}
