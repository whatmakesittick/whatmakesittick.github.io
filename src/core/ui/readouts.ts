import type { ExplainerStore, Playback, Readout } from '../explainer';
import { onLanguageChanged } from '../i18n';
import { html, requireElement, setText } from './dom';
import { TEXT_REFRESH_INTERVAL_MS, throttle } from './throttle';

const TONE_PROPERTY = '--tone';
const METER_FILL_PROPERTY = '--meter-fill';

interface ReadoutRow<S extends Playback> {
  readout: Readout<S>;
  element: HTMLElement;
  value: HTMLElement;
  meter?: HTMLElement;
}

function createMeter<S extends Playback>(readout: Readout<S>): HTMLElement | undefined {
  if (!readout.meter) return undefined;
  return html('span', {
    class: 'meter-fill',
    style: `${METER_FILL_PROPERTY}: ${readout.meter.fill}`,
  });
}

function createRow<S extends Playback>(readout: Readout<S>): ReadoutRow<S> {
  const valueClass = readout.numeric ? 'number' : 'tone-text';
  const meter = createMeter(readout);
  const value = meter ? html('span') : html('dd', { class: valueClass });
  const content = meter
    ? html('dd', { class: `${valueClass} readout-meter` }, [
        html('span', { class: 'meter', 'aria-hidden': 'true' }, [meter]),
        value,
      ])
    : value;
  const element = html('div', { class: 'readout', 'data-readout': readout.id }, [
    html('dt', { 'data-i18n': readout.labelKey }),
    content,
  ]);
  return { readout, element, value, meter };
}

function renderRow<S extends Playback>(row: ReadoutRow<S>, state: S): void {
  const { readout, value, meter } = row;
  setText(value, readout.value(state));
  const tone = readout.tone?.(state);
  if (tone) value.style.setProperty(TONE_PROPERTY, tone);
  if (meter && readout.meter) meter.style.transform = `scaleX(${readout.meter.share(state)})`;
}

export function mountReadouts<S extends Playback>(
  root: Document,
  store: ExplainerStore<S>,
  readouts: readonly Readout<S>[],
): void {
  const list = requireElement(root, '[data-readouts]');
  const rows = readouts.map(createRow);
  list.replaceChildren(...rows.map((row) => row.element));

  const render = throttle(() => {
    const state = store.getState();
    rows.forEach((row) => renderRow(row, state));
  }, TEXT_REFRESH_INTERVAL_MS);
  render();
  store.subscribe(render);
  onLanguageChanged(render);
}
