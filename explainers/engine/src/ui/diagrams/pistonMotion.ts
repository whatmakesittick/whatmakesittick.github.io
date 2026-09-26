import { t } from '@core/i18n';
import { html, svg } from '@core/ui/dom';
import { formatNumber } from '@core/format';
import {
  REVOLUTION_DEGREES,
  STROKE_DEGREES,
  crankGeometry,
  normalizeRevolution,
  pistonDisplacement,
  pistonSpeed,
} from '../../model';
import type { CrankGeometry } from '../../model';
import { currentSpec } from '../../state';
import { THEME } from '../../theme';
import { deadCentreLabel, formatDegrees, formatMillimetres, formatRpm } from '../format';
import {
  chartText,
  createChart,
  createCursor,
  horizontalTicks,
  legend,
  linePath,
  linearScale,
  niceTicks,
  sampleCurve,
  verticalGuides,
} from './chart';
import type { Domain, Guide, Margins, Scale } from './chart';
import type { Diagram } from './mount';

const HEIGHT = 340;
const MARGINS: Margins = { top: 26, right: 16, bottom: 30, left: 44 };
const PANEL_GAP = 44;
const DOMAIN: Domain = [0, REVOLUTION_DEGREES];
const SAMPLE_STEP = 1;
const PEAK_SEARCH_STEP = 0.5;
const REFERENCE_RPM = 3000;
const UPRIGHT_ROD_RATIO = 10_000;
const SPEED_HEADROOM = 1.2;
const DISTANCE_TICK_COUNT = 4;
const SPEED_TICK_COUNT = 4;
const QUARTER_TURN = 90;
const MARKER_RADIUS = 3.5;
const CURSOR_DOT_RADIUS = 4.5;
const PANEL_TITLE_OFFSET = 12;
const NOTE_GAP = 8;
const NOTE_OFFSETS = {
  right: { x: NOTE_GAP, y: 4 },
  above: { x: NOTE_GAP, y: -10 },
} as const;
const REAL_COLOR = THEME.accent;
const UPRIGHT_COLOR = THEME.muted;

type Curve = (angle: number) => number;

interface Panel {
  title: string;
  top: number;
  bottom: number;
  y: Scale;
  ticks: number[];
  real: Curve;
  upright: Curve;
}

function turnGuides(): Guide[] {
  return [
    { value: 0, label: deadCentreLabel('top') },
    { value: QUARTER_TURN, label: formatDegrees(QUARTER_TURN) },
    { value: STROKE_DEGREES, label: deadCentreLabel('bottom') },
    { value: STROKE_DEGREES + QUARTER_TURN, label: formatDegrees(STROKE_DEGREES + QUARTER_TURN) },
    { value: REVOLUTION_DEGREES, label: deadCentreLabel('top') },
  ];
}

function uprightRod(geometry: CrankGeometry): CrankGeometry {
  return { ...geometry, rodLength: geometry.crankRadius * UPRIGHT_ROD_RATIO };
}

function distanceCurve(geometry: CrankGeometry): Curve {
  return (angle) => pistonDisplacement(angle, geometry);
}

function speedCurve(geometry: CrankGeometry): Curve {
  return (angle) => Math.abs(pistonSpeed(angle, geometry, REFERENCE_RPM));
}

function peakAngle(curve: Curve): number {
  let bestAngle = 0;
  for (let angle = 0; angle <= STROKE_DEGREES; angle += PEAK_SEARCH_STEP) {
    if (curve(angle) > curve(bestAngle)) bestAngle = angle;
  }
  return bestAngle;
}

function panelBounds(index: number): { top: number; bottom: number } {
  const panelHeight = (HEIGHT - MARGINS.top - MARGINS.bottom - PANEL_GAP) / 2;
  const top = MARGINS.top + index * (panelHeight + PANEL_GAP);
  return { top, bottom: top + panelHeight };
}

function createPanels(geometry: CrankGeometry): Panel[] {
  const distance = panelBounds(0);
  const speed = panelBounds(1);
  const realSpeed = speedCurve(geometry);
  const speedMax = realSpeed(peakAngle(realSpeed)) * SPEED_HEADROOM;
  const strokeLength = geometry.crankRadius * 2;
  return [
    {
      title: t('diagrams.pistonMotion.distanceTitle'),
      ...distance,
      y: linearScale([0, strokeLength], [distance.top, distance.bottom]),
      ticks: niceTicks(strokeLength, DISTANCE_TICK_COUNT).filter((tick) => tick <= strokeLength),
      real: distanceCurve(geometry),
      upright: distanceCurve(uprightRod(geometry)),
    },
    {
      title: t('diagrams.pistonMotion.speedTitle', { rpm: formatRpm(REFERENCE_RPM) }),
      ...speed,
      y: linearScale([0, speedMax], [speed.bottom, speed.top]),
      ticks: niceTicks(speedMax, SPEED_TICK_COUNT).filter((tick) => tick <= speedMax),
      real: realSpeed,
      upright: speedCurve(uprightRod(geometry)),
    },
  ];
}

function drawPanel(panel: Panel, x: Scale, width: number): SVGGElement {
  const right = width - MARGINS.right;
  const upright = sampleCurve(DOMAIN, SAMPLE_STEP, panel.upright, x, panel.y);
  const real = sampleCurve(DOMAIN, SAMPLE_STEP, panel.real, x, panel.y);
  return svg('g', {}, [
    chartText(
      panel.title,
      { x: MARGINS.left, y: panel.top - PANEL_TITLE_OFFSET, 'text-anchor': 'start' },
      'chart-title',
    ),
    horizontalTicks(panel.ticks, panel.y, MARGINS.left, right, formatNumber),
    svg('path', {
      class: 'chart-line chart-line-dashed',
      d: linePath(upright),
      stroke: UPRIGHT_COLOR,
    }),
    svg('path', { class: 'chart-line chart-line-bold', d: linePath(real), stroke: REAL_COLOR }),
  ]);
}

function annotatePoint(
  x: number,
  y: number,
  text: string,
  placement: keyof typeof NOTE_OFFSETS,
): SVGElement[] {
  const offset = NOTE_OFFSETS[placement];
  return [
    svg('circle', { class: 'chart-point', cx: x, cy: y, r: MARKER_RADIUS, fill: REAL_COLOR }),
    chartText(
      text,
      { x: x + offset.x, y: y + offset.y, 'text-anchor': 'start' },
      'chart-note chart-note-strong',
    ),
  ];
}

function distanceNotes(panel: Panel, x: Scale, width: number, strokeLength: number): SVGElement[] {
  const half = panel.y(strokeLength / 2);
  const atQuarter = panel.real(QUARTER_TURN);
  return [
    svg('line', {
      class: 'chart-reference',
      x1: MARGINS.left,
      x2: width - MARGINS.right,
      y1: half,
      y2: half,
    }),
    chartText(
      t('diagrams.pistonMotion.halfStroke'),
      { x: width - MARGINS.right, y: half - NOTE_GAP / 2, 'text-anchor': 'end' },
      'chart-note',
    ),
    ...annotatePoint(
      x(QUARTER_TURN),
      panel.y(atQuarter),
      t('diagrams.pistonMotion.quarterTurn', {
        distance: formatMillimetres(atQuarter),
        angle: formatDegrees(QUARTER_TURN),
      }),
      'right',
    ),
  ];
}

function speedNotes(panel: Panel, x: Scale): SVGElement[] {
  const angle = peakAngle(panel.real);
  const y = panel.y(panel.real(angle));
  const text = t('diagrams.pistonMotion.peak', { angle: formatDegrees(angle) });
  return annotatePoint(x(angle), y, text, 'above');
}

function cursorDot(): SVGCircleElement {
  return svg('circle', {
    class: 'chart-cursor-dot',
    cx: 0,
    r: CURSOR_DOT_RADIUS,
    fill: REAL_COLOR,
  });
}

export const pistonMotionDiagram: Diagram = {
  dependencies: () => [],
  draw(state, width) {
    const geometry = crankGeometry(currentSpec(state));
    const x = linearScale(DOMAIN, [MARGINS.left, width - MARGINS.right]);
    const [distance, speed] = createPanels(geometry);
    const dots = [cursorDot(), cursorDot()];
    const cursor = createCursor(distance.top, speed.bottom, dots);
    const chart = createChart(width, HEIGHT, t('diagrams.pistonMotion.description'));

    chart.append(
      verticalGuides(turnGuides(), x, distance.top, speed.bottom),
      drawPanel(distance, x, width),
      drawPanel(speed, x, width),
      ...distanceNotes(distance, x, width, geometry.crankRadius * 2),
      ...speedNotes(speed, x),
      cursor.element,
    );

    const element = html('div', { class: 'chart-block' }, [
      legend([
        { label: t('diagrams.pistonMotion.realPiston'), color: REAL_COLOR },
        { label: t('diagrams.pistonMotion.uprightRod'), color: UPRIGHT_COLOR, dashed: true },
      ]),
      chart,
    ]);

    return {
      element,
      moveCursor(angle) {
        const turn = normalizeRevolution(angle);
        cursor.moveTo(x(turn));
        dots[0].setAttribute('cy', String(distance.y(distance.real(turn))));
        dots[1].setAttribute('cy', String(speed.y(speed.real(turn))));
      },
    };
  },
};
