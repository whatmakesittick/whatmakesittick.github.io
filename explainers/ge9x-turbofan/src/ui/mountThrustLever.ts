import { translateDom } from '@core/i18n/dom';
import { html } from '@core/ui/dom';
import type { Disposer } from '@core/ui/disposers';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { LEVER_RANGE } from '../state';
import type { EngineStore } from '../state';
import { formatLever } from './format';

const LEVER_ID = 'gauge-thrust';

function createLever(): HTMLElement {
  return html('div', { class: 'range-widget gauge-lever' }, [
    html('div', { class: 'range-widget__header' }, [
      html('label', { for: LEVER_ID, 'data-i18n': 'gauge.lever' }),
      html('output', { class: 'number', for: LEVER_ID }),
    ]),
    html('input', { id: LEVER_ID, type: 'range', class: 'range', 'data-control': 'thrust' }),
  ]);
}

export function mountThrustLever(gauge: HTMLElement, store: EngineStore): Disposer {
  const lever = createLever();
  translateDom(lever);
  gauge.append(lever);
  const unmount = mountRangeWidget(lever, store, {
    control: 'thrust',
    range: LEVER_RANGE,
    select: (state) => [state.thrust] as const,
    value: ([thrust]) => thrust,
    format: ([thrust]) => formatLever(thrust),
    set: (state, thrust) => state.setThrust(thrust),
  });
  return () => {
    unmount();
    lever.remove();
  };
}
