import { t } from '@core/i18n';
import { translateDom } from '@core/i18n/dom';
import { html, setText, svg } from '@core/ui/dom';
import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { watch, watchLocalized } from '@core/ui/subscribe';
import { SIDE_IDS } from '../ids';
import type { PaceId, SideId } from '../ids';
import { CYCLE_UNITS, GAIT_DATA, HALF_CYCLE_UNITS, timingAt } from '../model';
import type { RunStore } from '../state';
import { THEME } from '../theme';
import { formatShareNumber } from './format';

const STRIP_HEIGHT = 10;
const SIDE_OFFSET_UNITS: Record<SideId, number> = { right: 0, left: HALF_CYCLE_UNITS };
const SIDE_TONES: Record<SideId, string> = {
  right: THEME.rightAccent,
  left: THEME.leftAccent,
};

export function footContactSpan(pace: PaceId, side: SideId): { start: number; end: number } {
  const start = SIDE_OFFSET_UNITS[side];
  return { start, end: start + GAIT_DATA[pace].toeOffUnits };
}

function createRow(side: SideId) {
  const contact = svg('rect', {
    y: 0,
    height: STRIP_HEIGHT,
    fill: SIDE_TONES[side],
  });
  const playhead = svg('line', {
    class: 'foot-strip__playhead',
    y1: 0,
    y2: STRIP_HEIGHT,
    'vector-effect': 'non-scaling-stroke',
  });
  const graphic = svg(
    'svg',
    {
      class: 'foot-strip__bar',
      viewBox: `0 0 ${CYCLE_UNITS} ${STRIP_HEIGHT}`,
      preserveAspectRatio: 'none',
      'aria-hidden': 'true',
    },
    [contact, playhead],
  );
  const row = html('div', { class: 'foot-strip__row', 'data-foot-strip-row': side }, [graphic]);
  return { row, contact, playhead };
}

function showContact(target: SVGElement, pace: PaceId, side: SideId): void {
  const { start, end } = footContactSpan(pace, side);
  target.setAttribute('x', String(start));
  target.setAttribute('width', String(end - start));
}

export function mountFootStrip(gauge: HTMLElement, store: RunStore): Disposer {
  const rows = SIDE_IDS.map((side) => ({ side, ...createRow(side) }));
  const caption = html('p', { class: 'foot-strip__caption' });
  const strip = html('div', { class: 'foot-strip', 'data-foot-strip': '' }, [
    ...rows.map(({ row }) => row),
    caption,
  ]);
  translateDom(strip);
  gauge.append(strip);
  return disposeAll([
    watch(
      store,
      (state) => state.pace,
      (pace) => rows.forEach(({ side, contact }) => showContact(contact, pace, side)),
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
      (pace) =>
        setText(
          caption,
          t('readouts.floatShare', { percent: formatShareNumber(timingAt(pace, 0).floatShare) }),
        ),
    ),
    () => strip.remove(),
  ]);
}
