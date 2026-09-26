import { t } from '@core/i18n';
import { html, svg } from '@core/ui/dom';
import {
  ENGINE_SPECS,
  ENGINE_TYPES,
  STROKE_START,
  ignitionStart,
  peakPressure,
  relativePressure,
} from '../../model';
import type { EngineSpec, EngineType, Point2 } from '../../model';
import { currentSpec } from '../../state';
import type { EngineState } from '../../state';
import { engineLabel, formatMultiple, formatPressure } from '../format';
import { ENGINE_COLORS, IGNITION_COLOR } from '../palette';
import {
  areaPath,
  chartText,
  createChart,
  createCursor,
  deadCentreGuides,
  horizontalTicks,
  legend,
  linePath,
  linearScale,
  niceTicks,
  sampleCurve,
  strokeBands,
  verticalGuides,
} from './chart';
import type { Domain, Margins, Scale } from './chart';
import type { Diagram } from './mount';

const HEIGHT = 280;
const MARGINS: Margins = { top: 34, right: 16, bottom: 42, left: 44 };
const HEADER = { top: 6, height: 20 };
const DOMAIN: Domain = [STROKE_START.compression, STROKE_START.exhaust];
const SAMPLE_STEP = 1;
const HEADROOM = 1.15;
const TICK_COUNT = 4;
const HEADER_OPACITY = 0.16;
const PLOT_TINT_OPACITY = 0.035;
const AREA_OPACITY = 0.14;
const INACTIVE_OPACITY = 0.5;
const CURSOR_DOT_RADIUS = 4.5;
const PEAK_LABEL_GAP = 8;
const SPARK_MARK_SIZE = 5;
const INJECTION_BAR_HEIGHT = 4;
const IGNITION_MARK_LIFT = 3;
const SUMMARY_KEYS: Record<EngineType, string> = {
  petrol: 'diagrams.pressure.summary.petrol',
  diesel: 'diagrams.pressure.summary.diesel',
};
const PEAK_SUMMARY_KEYS: Record<EngineType, string> = {
  petrol: 'diagrams.pressure.peakSummary.petrol',
  diesel: 'diagrams.pressure.peakSummary.diesel',
};

interface Frame {
  x: Scale;
  y: Scale;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

function byEngineType<T>(valueFor: (type: EngineType) => T): Record<EngineType, T> {
  return Object.fromEntries(ENGINE_TYPES.map((type) => [type, valueFor(type)])) as Record<
    EngineType,
    T
  >;
}

function specsByType(state: EngineState): Record<EngineType, EngineSpec> {
  return byEngineType((type) =>
    type === state.engineType ? currentSpec(state) : ENGINE_SPECS[type],
  );
}

function pressureCurve(spec: EngineSpec, frame: Frame): Point2[] {
  return sampleCurve(
    DOMAIN,
    SAMPLE_STEP,
    (angle) => relativePressure(angle, spec),
    frame.x,
    frame.y,
  );
}

function highestPoint(points: Point2[]): Point2 {
  return points.reduce((best, point) => (point.y < best.y ? point : best));
}

function createFrame(width: number, yMax: number): Frame {
  const top = MARGINS.top;
  const bottom = HEIGHT - MARGINS.bottom;
  const left = MARGINS.left;
  const right = width - MARGINS.right;
  return {
    x: linearScale(DOMAIN, [left, right]),
    y: linearScale([0, yMax], [bottom, top]),
    top,
    bottom,
    left,
    right,
  };
}

function curveLayer(points: Point2[], color: string, active: boolean, frame: Frame): SVGGElement {
  const line = svg('path', {
    class: active ? 'chart-line chart-line-bold' : 'chart-line chart-line-dashed',
    d: linePath(points),
    stroke: color,
  });
  if (!active) return svg('g', { opacity: INACTIVE_OPACITY }, [line]);
  const area = svg('path', {
    d: areaPath(points, frame.bottom),
    fill: color,
    opacity: AREA_OPACITY,
  });
  return svg('g', {}, [area, line]);
}

function ignitionMark(spec: EngineSpec, frame: Frame): SVGElement {
  const start = frame.x(ignitionStart(spec));
  const base = frame.bottom - IGNITION_MARK_LIFT;
  if (spec.ignition === 'spark') {
    return svg('path', {
      d: `M${start},${base - SPARK_MARK_SIZE * 2}L${start - SPARK_MARK_SIZE},${base}L${start + SPARK_MARK_SIZE},${base}Z`,
      fill: IGNITION_COLOR,
    });
  }
  const end = frame.x(ignitionStart(spec) + spec.ignitionEvent.duration);
  return svg('rect', {
    x: start,
    y: base - INJECTION_BAR_HEIGHT,
    width: end - start,
    height: INJECTION_BAR_HEIGHT,
    rx: INJECTION_BAR_HEIGHT / 2,
    fill: IGNITION_COLOR,
  });
}

function peakLabel(points: Point2[], peak: number): SVGTextElement {
  const highest = highestPoint(points);
  return chartText(
    t('diagrams.pressure.peak', { value: formatPressure(peak) }),
    { x: highest.x + PEAK_LABEL_GAP, y: highest.y, 'text-anchor': 'start' },
    'chart-note chart-note-strong',
  );
}

function describe(active: EngineType, peaks: Record<EngineType, number>): string {
  const peakSummaries = ENGINE_TYPES.map((type) =>
    t(PEAK_SUMMARY_KEYS[type], { value: formatPressure(peaks[type]) }),
  );
  return [t(SUMMARY_KEYS[active]), ...peakSummaries].join(' ');
}

export const pressureDiagram: Diagram = {
  dependencies: (state) => [state.engineType, state.compressionRatio],
  draw(state, width) {
    const specs = specsByType(state);
    const active = state.engineType;
    const peaks = byEngineType((type) => peakPressure(specs[type]));
    const yMax = Math.max(...ENGINE_TYPES.map((type) => peaks[type])) * HEADROOM;
    const frame = createFrame(width, yMax);
    const points = byEngineType((type) => pressureCurve(specs[type], frame));
    const drawingOrder = [...ENGINE_TYPES.filter((type) => type !== active), active];
    const dot = svg('circle', {
      class: 'chart-cursor-dot',
      cx: 0,
      r: CURSOR_DOT_RADIUS,
      fill: ENGINE_COLORS[active],
    });
    const cursor = createCursor(HEADER.top, frame.bottom, [dot]);
    const chart = createChart(width, HEIGHT, describe(active, peaks));
    const ticks = niceTicks(yMax, TICK_COUNT).filter((tick) => tick <= yMax);

    chart.append(
      strokeBands({ x: frame.x, domain: DOMAIN, ...HEADER, opacity: HEADER_OPACITY, labels: true }),
      strokeBands({
        x: frame.x,
        domain: DOMAIN,
        top: frame.top,
        height: frame.bottom - frame.top,
        opacity: PLOT_TINT_OPACITY,
      }),
      horizontalTicks(ticks, frame.y, frame.left, frame.right, formatMultiple),
      verticalGuides(deadCentreGuides(DOMAIN), frame.x, frame.top, frame.bottom),
      ...drawingOrder.map((type) =>
        curveLayer(points[type], ENGINE_COLORS[type], type === active, frame),
      ),
      ...drawingOrder.map((type) =>
        svg('g', { opacity: type === active ? 1 : INACTIVE_OPACITY }, [
          ignitionMark(specs[type], frame),
        ]),
      ),
      peakLabel(points[active], peaks[active]),
      cursor.element,
    );

    const element = html('div', { class: 'chart-block' }, [
      legend(
        ENGINE_TYPES.map((type) => ({
          label: engineLabel(type),
          color: ENGINE_COLORS[type],
          dashed: type !== active,
          muted: type !== active,
        })),
      ),
      chart,
    ]);

    return {
      element,
      moveCursor(angle) {
        const visible = angle >= DOMAIN[0] && angle <= DOMAIN[1];
        cursor.element.setAttribute('visibility', visible ? 'visible' : 'hidden');
        if (!visible) return;
        cursor.moveTo(frame.x(angle));
        dot.setAttribute('cy', String(frame.y(relativePressure(angle, specs[active]))));
      },
    };
  },
};
