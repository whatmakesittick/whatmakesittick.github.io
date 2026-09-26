import { t } from '@core/i18n';
import { svg } from '@core/ui/dom';
import { formatNumber } from '@core/format';
import {
  CYCLE_DEGREES,
  exhaustLift,
  ignitionStart,
  intakeLift,
  valveDuration,
  valveOverlap,
} from '../../model';
import type { EngineSpec, EngineType, IgnitionKind } from '../../model';
import { currentSpec } from '../../state';
import { THEME } from '../../theme';
import { deadCentreOffset, formatDegrees, formatOffsetLong, formatOffsetShort } from '../format';
import { IGNITION_COLOR, VALVE_COLORS } from '../palette';
import {
  areaPath,
  chartText,
  createChart,
  createCursor,
  deadCentreGuides,
  linePath,
  linearScale,
  sampleCurve,
  strokeBands,
  textFits,
  verticalGuides,
} from './chart';
import type { Domain, Margins, Scale } from './chart';
import type { Diagram } from './mount';

const HEIGHT = 244;
const MARGINS: Margins = { top: 34, right: 14, bottom: 42, left: 62 };
const DOMAIN: Domain = [-45, 765];
const HEADER = { top: 6, height: 20 };
const ROW_GAP = 10;
const LABEL_LANE = 16;
const LIFT_TOP_PADDING = 4;
const SAMPLE_STEP = 2;
const AREA_OPACITY = 0.3;
const OVERLAP_OPACITY = 0.16;
const NEIGHBOUR_SHADE_OPACITY = 0.55;
const ROW_NAME_GAP = 10;
const EVENT_LABEL_OFFSET = 12;
const IGNITION_LABEL_GAP = 6;
const OVERLAP_LABEL_OFFSET = 12;
const HEADER_OPACITY = 0.16;
const IGNITION_KEYS: Record<IgnitionKind, { name: string; at: string }> = {
  spark: { name: 'diagrams.valveTiming.spark', at: 'diagrams.valveTiming.sparkAt' },
  compression: { name: 'diagrams.valveTiming.injection', at: 'diagrams.valveTiming.injectionAt' },
};
const TITLE_KEYS: Record<EngineType, string> = {
  petrol: 'diagrams.valveTiming.title.petrol',
  diesel: 'diagrams.valveTiming.title.diesel',
};

interface ValveRow {
  name: string;
  color: string;
  open: number;
  close: number;
  lift: (angle: number) => number;
}

interface RowFrame {
  top: number;
  baseline: number;
}

interface Layout {
  x: Scale;
  rows: RowFrame[];
  top: number;
  bottom: number;
}

function valveRows(spec: EngineSpec): ValveRow[] {
  const { intakeOpen, intakeClose, exhaustOpen, exhaustClose } = spec.valveTiming;
  return [
    {
      name: t('diagrams.valveTiming.intake'),
      color: VALVE_COLORS.intake,
      open: intakeOpen,
      close: intakeClose,
      lift: (angle) => intakeLift(angle, spec),
    },
    {
      name: t('diagrams.valveTiming.exhaust'),
      color: VALVE_COLORS.exhaust,
      open: exhaustOpen,
      close: exhaustClose,
      lift: (angle) => exhaustLift(angle, spec),
    },
  ];
}

function mainWindow(row: ValveRow): { start: number; end: number } {
  const duration = valveDuration(row.open, row.close);
  const start = row.open + duration / 2 < CYCLE_DEGREES ? row.open : row.open - CYCLE_DEGREES;
  return { start, end: start + duration };
}

function createLayout(width: number): Layout {
  const rowHeight = (HEIGHT - MARGINS.top - MARGINS.bottom - ROW_GAP) / 2;
  const rows = [0, 1].map((index) => {
    const top = MARGINS.top + index * (rowHeight + ROW_GAP);
    return { top, baseline: top + rowHeight - LABEL_LANE };
  });
  return {
    x: linearScale(DOMAIN, [MARGINS.left, width - MARGINS.right]),
    rows,
    top: rows[0].top,
    bottom: rows[rows.length - 1].baseline,
  };
}

function eventLabelTexts(start: number, end: number, room: number): readonly [string, string] {
  const opening = deadCentreOffset(start);
  const closing = deadCentreOffset(end);
  const candidates: (readonly [string, string])[] = [
    [
      t('diagrams.valveTiming.opens', { offset: formatOffsetLong(opening) }),
      t('diagrams.valveTiming.closes', { offset: formatOffsetLong(closing) }),
    ],
    [formatOffsetShort(opening), formatOffsetShort(closing)],
    [formatDegrees(opening.degrees), formatDegrees(closing.degrees)],
  ];
  const fitting = candidates.find(([open, close]) => textFits(`${open} ${close}`, room));
  return fitting ?? candidates[candidates.length - 1];
}

function eventLabels(row: ValveRow, x: Scale, baseline: number): SVGTextElement[] {
  const { start, end } = mainWindow(row);
  const [openText, closeText] = eventLabelTexts(start, end, x(end) - x(start));
  const y = baseline + EVENT_LABEL_OFFSET;
  return [
    chartText(openText, { x: x(start), y, 'text-anchor': 'start' }, 'chart-note'),
    chartText(closeText, { x: x(end), y, 'text-anchor': 'end' }, 'chart-note'),
  ];
}

function valveShape(row: ValveRow, spec: EngineSpec, x: Scale, frame: RowFrame): SVGGElement {
  const y = linearScale([0, spec.maxValveLift], [frame.baseline, frame.top + LIFT_TOP_PADDING]);
  const points = sampleCurve(DOMAIN, SAMPLE_STEP, row.lift, x, y);
  return svg('g', {}, [
    svg('line', {
      class: 'chart-baseline',
      x1: x(DOMAIN[0]),
      x2: x(DOMAIN[1]),
      y1: frame.baseline,
      y2: frame.baseline,
    }),
    svg('path', { d: areaPath(points, frame.baseline), fill: row.color, opacity: AREA_OPACITY }),
    svg('path', { class: 'chart-line', d: linePath(points), stroke: row.color }),
  ]);
}

function rowLabels(row: ValveRow, x: Scale, frame: RowFrame): SVGGElement {
  const middle = (frame.top + frame.baseline) / 2;
  return svg('g', {}, [
    chartText(
      row.name,
      { x: MARGINS.left - ROW_NAME_GAP, y: middle, fill: row.color },
      'chart-row-label',
    ),
    ...eventLabels(row, x, frame.baseline),
  ]);
}

function overlapBands(spec: EngineSpec, layout: Layout): SVGGElement {
  const { x, top, bottom } = layout;
  const overlap = valveOverlap(spec);
  const starts = [spec.valveTiming.intakeOpen - CYCLE_DEGREES, spec.valveTiming.intakeOpen];
  return svg(
    'g',
    {},
    starts.map((start) =>
      svg('rect', {
        x: x(start),
        y: top,
        width: x(start + overlap) - x(start),
        height: bottom - top,
        fill: THEME.accent,
        opacity: OVERLAP_OPACITY,
      }),
    ),
  );
}

function overlapLabel(spec: EngineSpec, layout: Layout): SVGTextElement {
  const end = spec.valveTiming.intakeOpen + valveOverlap(spec);
  return chartText(
    t('diagrams.valveTiming.overlap'),
    {
      x: layout.x(end),
      y: layout.top + OVERLAP_LABEL_OFFSET,
      'text-anchor': 'end',
      fill: THEME.accent,
    },
    'chart-note',
  );
}

function neighbourShades(layout: Layout): SVGGElement {
  const { x, top } = layout;
  const height = layout.bottom + LABEL_LANE - top;
  const ranges: Domain[] = [
    [DOMAIN[0], 0],
    [CYCLE_DEGREES, DOMAIN[1]],
  ];
  return svg(
    'g',
    {},
    ranges.map(([from, to]) =>
      svg('rect', {
        x: x(from),
        y: top,
        width: x(to) - x(from),
        height,
        fill: THEME.background,
        opacity: NEIGHBOUR_SHADE_OPACITY,
      }),
    ),
  );
}

function ignitionMarker(spec: EngineSpec, layout: Layout): SVGGElement {
  const { x, rows } = layout;
  const position = x(ignitionStart(spec));
  const exhaustRow = rows[1];
  const keys = IGNITION_KEYS[spec.ignition];
  const name = t(keys.name);
  const longText = t(keys.at, { offset: formatOffsetLong(deadCentreOffset(ignitionStart(spec))) });
  const room = position - x(spec.valveTiming.exhaustClose);
  const text = textFits(longText, room) ? longText : name;
  return svg('g', {}, [
    svg('line', {
      class: 'chart-marker',
      x1: position,
      x2: position,
      y1: layout.top,
      y2: layout.bottom,
      stroke: IGNITION_COLOR,
    }),
    chartText(
      text,
      {
        x: position - IGNITION_LABEL_GAP,
        y: (exhaustRow.top + exhaustRow.baseline) / 2,
        'text-anchor': 'end',
        fill: IGNITION_COLOR,
      },
      'chart-note',
    ),
  ]);
}

function describe(spec: EngineSpec): string {
  const [intake, exhaust] = valveRows(spec).map(mainWindow);
  const phrase = (angle: number) => formatOffsetLong(deadCentreOffset(angle));
  const summary = t('diagrams.valveTiming.summary', {
    intakeOpens: phrase(intake.start),
    intakeCloses: phrase(intake.end),
    exhaustOpens: phrase(exhaust.start),
    exhaustCloses: phrase(exhaust.end),
    overlap: formatNumber(valveOverlap(spec)),
  });
  return `${t(TITLE_KEYS[spec.type])} ${summary}`;
}

export const valveTimingDiagram: Diagram = {
  dependencies: (state) => [state.engineType, state.compressionRatio],
  draw(state, width) {
    const spec = currentSpec(state);
    const layout = createLayout(width);
    const { x, rows } = layout;
    const valves = valveRows(spec);
    const chart = createChart(width, HEIGHT, describe(spec));
    const cursor = createCursor(HEADER.top, layout.bottom);

    chart.append(
      strokeBands({ x, domain: DOMAIN, ...HEADER, opacity: HEADER_OPACITY, labels: true }),
      verticalGuides(deadCentreGuides(DOMAIN), x, layout.top, layout.bottom + LABEL_LANE),
      overlapBands(spec, layout),
      ...valves.map((row, index) => valveShape(row, spec, x, rows[index])),
      neighbourShades(layout),
      ...valves.map((row, index) => rowLabels(row, x, rows[index])),
      overlapLabel(spec, layout),
      ignitionMarker(spec, layout),
      cursor.element,
    );

    return { element: chart, moveCursor: (angle) => cursor.moveTo(x(angle)) };
  },
};
