import { onLanguageChanged, t } from '@core/i18n';
import { translateDom } from '@core/i18n/dom';
import { html, requireElement, setText, svg } from '@core/ui/dom';
import { watch, watchLocalized, watchShallow } from '@core/ui/subscribe';
import {
  ENGINE_SPECS,
  STROKES,
  STROKE_DEGREES,
  STROKE_START,
  ignitionStart,
  strokeAt,
  valveDuration,
} from '../model';
import type { EngineSpec, IgnitionKind, Stroke } from '../model';
import { currentSpec } from '../state';
import type { EngineStore } from '../state';
import { DIAL_CENTRE, DIAL_SIZE, dialArc, dialPoint, dialRotation } from './dialGeometry';
import { deadCentreLabel, strokeLabel } from './format';
import type { DeadCentre } from './format';
import { IGNITION_COLOR, STROKE_COLORS, VALVE_COLORS } from './palette';

const RING_RADIUS = 86;
const RING_WIDTH = 12;
const STROKE_GAP_DEGREES = 3;
const INTAKE_RADIUS = 72;
const EXHAUST_RADIUS = 65;
const WINDOW_WIDTH = 4;
const IGNITION_RADIUS = 57;
const IGNITION_WIDTH = 5;
const IGNITION_MIN_SPAN = 4;
const TICK_INNER = 77;
const TICK_OUTER = 96;
const LABEL_RADIUS = 109;
const NEEDLE_LENGTH = 94;
const NEEDLE_HUB_RADIUS = 5;
const INACTIVE_STROKE_OPACITY = 0.32;
const DEAD_CENTRES: readonly { angle: number; centre: DeadCentre }[] = [
  { angle: 0, centre: 'top' },
  { angle: 180, centre: 'bottom' },
  { angle: 360, centre: 'top' },
  { angle: 540, centre: 'bottom' },
];
const IGNITION_LEGEND_KEYS: Record<IgnitionKind, string> = {
  spark: 'dial.legend.spark',
  compression: 'dial.legend.injection',
};

type StrokeArcs = Record<Stroke, SVGPathElement>;

function createStrokeArcs(): StrokeArcs {
  const arcs = STROKES.map((stroke) => {
    const start = STROKE_START[stroke] + STROKE_GAP_DEGREES / 2;
    const path = svg('path', {
      class: 'dial-stroke',
      d: dialArc(RING_RADIUS, start, STROKE_DEGREES - STROKE_GAP_DEGREES),
      stroke: STROKE_COLORS[stroke],
      'stroke-width': RING_WIDTH,
    });
    return [stroke, path] as const;
  });
  return Object.fromEntries(arcs) as StrokeArcs;
}

function createDeadCentreMarks(): SVGElement[] {
  return DEAD_CENTRES.flatMap(({ angle, centre }) => {
    const inner = dialPoint(TICK_INNER, angle);
    const outer = dialPoint(TICK_OUTER, angle);
    const labelPoint = dialPoint(LABEL_RADIUS, angle);
    return [
      svg('line', { class: 'dial-tick', x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y }),
      svg('text', { class: 'dial-tick-label', x: labelPoint.x, y: labelPoint.y }, [
        deadCentreLabel(centre),
      ]),
    ];
  });
}

function createValveWindow(
  radius: number,
  open: number,
  close: number,
  color: string,
): SVGPathElement {
  return svg('path', {
    class: 'dial-window',
    d: dialArc(radius, open, valveDuration(open, close)),
    stroke: color,
    'stroke-width': WINDOW_WIDTH,
  });
}

function createIgnitionMark(spec: EngineSpec): SVGPathElement {
  const span = Math.max(IGNITION_MIN_SPAN, spec.ignitionEvent.duration);
  return svg('path', {
    class: 'dial-window',
    d: dialArc(IGNITION_RADIUS, ignitionStart(spec), span),
    stroke: IGNITION_COLOR,
    'stroke-width': IGNITION_WIDTH,
  });
}

function createTimingWindows(spec: EngineSpec): SVGElement[] {
  const { intakeOpen, intakeClose, exhaustOpen, exhaustClose } = spec.valveTiming;
  return [
    createValveWindow(INTAKE_RADIUS, intakeOpen, intakeClose, VALVE_COLORS.intake),
    createValveWindow(EXHAUST_RADIUS, exhaustOpen, exhaustClose, VALVE_COLORS.exhaust),
    createIgnitionMark(spec),
  ];
}

function createNeedle(): SVGGElement {
  return svg('g', { class: 'dial-needle' }, [
    svg('line', {
      x1: DIAL_CENTRE,
      y1: DIAL_CENTRE,
      x2: DIAL_CENTRE,
      y2: DIAL_CENTRE - NEEDLE_LENGTH,
    }),
    svg('circle', { cx: DIAL_CENTRE, cy: DIAL_CENTRE, r: NEEDLE_HUB_RADIUS }),
  ]);
}

function highlightStroke(arcs: StrokeArcs, label: SVGTextElement, current: Stroke): void {
  for (const stroke of STROKES) {
    arcs[stroke].setAttribute(
      'opacity',
      stroke === current ? '1' : String(INACTIVE_STROKE_OPACITY),
    );
  }
  setText(label, strokeLabel(current));
  label.setAttribute('fill', STROKE_COLORS[current]);
}

function mountDial(container: HTMLElement, ignitionLegend: HTMLElement, store: EngineStore): void {
  const arcs = createStrokeArcs();
  const marks = svg('g');
  const windows = svg('g');
  const needle = createNeedle();
  const centreLabel = svg('text', { class: 'dial-centre', x: DIAL_CENTRE, y: DIAL_CENTRE });
  const track = svg('circle', {
    class: 'dial-track',
    cx: DIAL_CENTRE,
    cy: DIAL_CENTRE,
    r: RING_RADIUS,
    'stroke-width': RING_WIDTH,
  });

  const dial = svg(
    'svg',
    { class: 'dial', viewBox: `0 0 ${DIAL_SIZE} ${DIAL_SIZE}`, role: 'img' },
    [track, ...Object.values(arcs), marks, windows, needle, centreLabel],
  );
  container.replaceChildren(dial);

  const translateStaticText = () => {
    dial.setAttribute('aria-label', t('dial.label'));
    marks.replaceChildren(...createDeadCentreMarks());
  };
  translateStaticText();
  onLanguageChanged(translateStaticText);

  watchShallow(
    store,
    (state) => [state.engineType, state.compressionRatio] as const,
    () => windows.replaceChildren(...createTimingWindows(currentSpec(store.getState()))),
  );
  watchLocalized(
    store,
    (state) => ENGINE_SPECS[state.engineType].ignition,
    (ignition) => setText(ignitionLegend, t(IGNITION_LEGEND_KEYS[ignition])),
  );
  watchLocalized(
    store,
    (state) => strokeAt(state.phase),
    (stroke) => highlightStroke(arcs, centreLabel, stroke),
  );
  watch(
    store,
    (state) => state.phase,
    (angle) => needle.setAttribute('transform', dialRotation(angle)),
  );
}

function createLegend(ignition: HTMLElement): HTMLElement {
  return html('ul', { class: 'dial-legend', 'data-i18n-attr': 'aria-label:dial.legend.label' }, [
    html('li', { 'data-tone': 'intake', 'data-i18n': 'dial.legend.intakeOpen' }),
    html('li', { 'data-tone': 'exhaust', 'data-i18n': 'dial.legend.exhaustOpen' }),
    ignition,
  ]);
}

export function mountGaugeDial(root: Document, store: EngineStore): void {
  const dial = html('div');
  const ignition = html('li', { 'data-tone': 'ignition' });
  const block = html('div', { class: 'gauge-dial' }, [dial, createLegend(ignition)]);
  translateDom(block);
  requireElement(root, '[data-gauge]').prepend(block);
  mountDial(dial, ignition, store);
}
