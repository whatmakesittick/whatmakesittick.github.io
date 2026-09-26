import { t } from '@core/i18n';
import { html, setText, svg } from '@core/ui/dom';
import {
  CYCLE_DEGREES,
  LAYOUTS,
  STROKES,
  STROKE_DEGREES,
  STROKE_START,
  cylinderAngle,
  firingOrder,
  normalizeAngle,
  strokeAt,
} from '../../model';
import type { CylinderSlot, Stroke } from '../../model';
import { formatDegrees, strokeLabel } from '../format';
import { STROKE_COLORS } from '../palette';
import {
  chartText,
  createChart,
  createCursor,
  linearScale,
  textFits,
  verticalGuides,
} from './chart';
import type { Domain, Guide, Margins, Scale } from './chart';
import type { Diagram } from './mount';

const LAYOUT = LAYOUTS.inline4;
const CYLINDERS = [...LAYOUT.cylinders].sort((a, b) => a.number - b.number);
const ROW_HEIGHT = 20;
const ROW_GAP = 8;
const MARGINS: Margins = { top: 4, right: 14, bottom: 26, left: 30 };
const DOMAIN: Domain = [0, CYCLE_DEGREES];
const POWER_OPACITY = 0.95;
const IDLE_OPACITY = 0.24;
const SEGMENT_RADIUS = 3;
const SEGMENT_GAP = 1;
const ROW_LABEL_GAP = 12;
const HEIGHT =
  MARGINS.top + CYLINDERS.length * ROW_HEIGHT + (CYLINDERS.length - 1) * ROW_GAP + MARGINS.bottom;
const GUIDE_ANGLES = [0, 180, 360, 540, 720];

interface Segment {
  stroke: Stroke;
  from: number;
  to: number;
}

interface Chip {
  slot: CylinderSlot;
  element: HTMLLIElement;
  strokeText: HTMLSpanElement;
}

export function describeFiringOrder(): string {
  return firingOrder(LAYOUT).join('-');
}

function angleGuides(): Guide[] {
  return GUIDE_ANGLES.map((value) => ({ value, label: formatDegrees(value) }));
}

function strokeSegments(slot: CylinderSlot): Segment[] {
  return STROKES.flatMap((stroke) => {
    const from = normalizeAngle(STROKE_START[stroke] - slot.phaseOffset);
    const to = from + STROKE_DEGREES;
    if (to <= CYCLE_DEGREES) return [{ stroke, from, to }];
    return [
      { stroke, from, to: CYCLE_DEGREES },
      { stroke, from: 0, to: to - CYCLE_DEGREES },
    ];
  });
}

function rowTop(index: number): number {
  return MARGINS.top + index * (ROW_HEIGHT + ROW_GAP);
}

function segmentShape(segment: Segment, x: Scale, top: number): SVGElement[] {
  const isPower = segment.stroke === 'power';
  const left = x(segment.from) + SEGMENT_GAP / 2;
  const width = x(segment.to) - x(segment.from) - SEGMENT_GAP;
  const shape = svg('rect', {
    x: left,
    y: top,
    width,
    height: ROW_HEIGHT,
    rx: SEGMENT_RADIUS,
    fill: STROKE_COLORS[segment.stroke],
    opacity: isPower ? POWER_OPACITY : IDLE_OPACITY,
  });
  const name = strokeLabel(segment.stroke);
  if (!isPower || !textFits(name, width)) return [shape];
  const label = chartText(
    name,
    { x: left + width / 2, y: top + ROW_HEIGHT / 2 },
    'chart-segment-label',
  );
  return [shape, label];
}

function cylinderRow(slot: CylinderSlot, index: number, x: Scale): SVGGElement {
  const top = rowTop(index);
  return svg('g', {}, [
    chartText(
      String(slot.number),
      { x: MARGINS.left - ROW_LABEL_GAP, y: top + ROW_HEIGHT / 2 },
      'chart-row-label',
    ),
    ...strokeSegments(slot).flatMap((segment) => segmentShape(segment, x, top)),
  ]);
}

function createChip(slot: CylinderSlot): Chip {
  const strokeText = html('span', { class: 'cylinder-stroke' });
  const element = html('li', { class: 'cylinder-chip' }, [
    html('span', { class: 'visually-hidden' }, [t('diagrams.firingOrder.cylinder')]),
    html('span', { class: 'cylinder-number' }, [String(slot.number)]),
    strokeText,
  ]);
  return { slot, element, strokeText };
}

function updateChip(chip: Chip, engineAngle: number): void {
  const stroke = strokeAt(cylinderAngle(engineAngle, chip.slot));
  if (chip.element.dataset.stroke === stroke) return;
  chip.element.dataset.stroke = stroke;
  setText(chip.strokeText, strokeLabel(stroke));
}

function createSequenceSteps(): Map<number, HTMLSpanElement> {
  return new Map(
    firingOrder(LAYOUT).map((number) => [
      number,
      html('span', { class: 'firing-step' }, [String(number)]),
    ]),
  );
}

function highlightFiringStep(steps: Map<number, HTMLSpanElement>, chips: Chip[]): void {
  for (const chip of chips) {
    steps
      .get(chip.slot.number)
      ?.toggleAttribute('data-firing', chip.element.dataset.stroke === 'power');
  }
}

export const firingOrderDiagram: Diagram = {
  dependencies: () => [],
  draw(_state, width) {
    const x = linearScale(DOMAIN, [MARGINS.left, width - MARGINS.right]);
    const plotBottom = rowTop(CYLINDERS.length - 1) + ROW_HEIGHT;
    const cursor = createCursor(MARGINS.top, plotBottom);
    const chips = CYLINDERS.map(createChip);
    const steps = createSequenceSteps();
    const chart = createChart(
      width,
      HEIGHT,
      t('diagrams.firingOrder.description', { order: describeFiringOrder() }),
    );

    chart.append(
      verticalGuides(angleGuides(), x, MARGINS.top, plotBottom),
      ...CYLINDERS.map((slot, index) => cylinderRow(slot, index, x)),
      cursor.element,
    );

    const element = html('div', { class: 'chart-block firing' }, [
      html('p', { class: 'firing-sequence' }, [
        t('diagrams.firingOrder.sequence'),
        ...steps.values(),
      ]),
      html(
        'ul',
        { class: 'cylinder-chips', 'aria-label': t('diagrams.firingOrder.chipsLabel') },
        chips.map((chip) => chip.element),
      ),
      chart,
    ]);

    return {
      element,
      moveCursor(angle) {
        cursor.moveTo(x(angle));
        chips.forEach((chip) => updateChip(chip, angle));
        highlightFiringStep(steps, chips);
      },
    };
  },
};
