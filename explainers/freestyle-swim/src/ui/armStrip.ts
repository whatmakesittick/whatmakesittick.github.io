import { t } from '@core/i18n';
import { translateDom } from '@core/i18n/dom';
import { html, setText, svg } from '@core/ui/dom';
import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { watch, watchLocalized } from '@core/ui/subscribe';
import { ARM_IDS, PHASE_IDS } from '../ids';
import type { ArmId, PaceId, PhaseId } from '../ids';
import { CYCLE_UNITS, LEFT_ARM_OFFSET_UNITS, phaseBounds } from '../model';
import type { SwimStore } from '../state';
import { PHASE_TONES } from '../theme';
import { gapText } from './text';

export interface StripSegment {
  phase: PhaseId;
  start: number;
  end: number;
}

const ARM_OFFSET_UNITS: Record<ArmId, number> = { right: 0, left: LEFT_ARM_OFFSET_UNITS };
const STRIP_HEIGHT = 10;

function shiftedSegments(phase: PhaseId, start: number, end: number, offset: number) {
  const first = start + offset;
  const last = end + offset;
  if (last <= CYCLE_UNITS) return [{ phase, start: first, end: last }];
  if (first >= CYCLE_UNITS) {
    return [{ phase, start: first - CYCLE_UNITS, end: last - CYCLE_UNITS }];
  }
  return [
    { phase, start: first, end: CYCLE_UNITS },
    { phase, start: 0, end: last - CYCLE_UNITS },
  ];
}

export function armStripSegments(pace: PaceId, arm: ArmId): StripSegment[] {
  const bounds = phaseBounds(pace);
  return PHASE_IDS.flatMap((phase) => {
    const [start, end] = bounds[phase];
    return shiftedSegments(phase, start, end, ARM_OFFSET_UNITS[arm]);
  });
}

function createRow(arm: ArmId) {
  const segments = svg('g');
  const playhead = svg('line', {
    class: 'arm-strip__playhead',
    y1: 0,
    y2: STRIP_HEIGHT,
    'vector-effect': 'non-scaling-stroke',
  });
  const graphic = svg(
    'svg',
    {
      class: 'arm-strip__bar',
      viewBox: `0 0 ${CYCLE_UNITS} ${STRIP_HEIGHT}`,
      preserveAspectRatio: 'none',
      'aria-hidden': 'true',
    },
    [segments, playhead],
  );
  const row = html('div', { class: 'arm-strip__row', 'data-arm-strip-row': arm }, [graphic]);
  return { row, segments, playhead };
}

function showSegments(target: SVGGElement, pace: PaceId, arm: ArmId): void {
  target.replaceChildren(
    ...armStripSegments(pace, arm).map(({ phase, start, end }) =>
      svg('rect', {
        x: start,
        y: 0,
        width: end - start,
        height: STRIP_HEIGHT,
        fill: PHASE_TONES[phase],
      }),
    ),
  );
}

export function mountArmStrip(gauge: HTMLElement, store: SwimStore): Disposer {
  const rows = ARM_IDS.map((arm) => ({ arm, ...createRow(arm) }));
  const caption = html('p', { class: 'arm-strip__caption' });
  const strip = html('div', { class: 'arm-strip', 'data-arm-strip': '' }, [
    ...rows.map(({ row }) => row),
    caption,
  ]);
  translateDom(strip);
  gauge.append(strip);
  return disposeAll([
    watch(
      store,
      (state) => state.pace,
      (pace) => rows.forEach(({ arm, segments }) => showSegments(segments, pace, arm)),
    ),
    watch(
      store,
      (state) => state.phase,
      (phase) =>
        rows.forEach(({ playhead }) => {
          playhead.setAttribute('x1', String(phase));
          playhead.setAttribute('x2', String(phase));
        }),
    ),
    watchLocalized(
      store,
      (state) => state.pace,
      (pace) => setText(caption, t('readouts.armGap', { gap: gapText(pace) })),
    ),
    () => strip.remove(),
  ]);
}
