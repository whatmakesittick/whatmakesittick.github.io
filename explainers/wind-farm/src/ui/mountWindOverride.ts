import type { Disposer } from '@core/ui/disposers';
import { requireElement } from '@core/ui/dom';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { WIND_OVERRIDE_RANGE, liveWind } from '../state';
import type { WindFarmStore } from '../state';
import { formatWind } from './format';

const WIND_OVERRIDE_CONTROL = 'wind-override';
const RANGE_WIDGET = '.range-widget';

type SelectedWind = readonly [wind: number];

function widgetAround(root: Document, inputId: string): HTMLElement {
  const input = requireElement<HTMLInputElement>(root, `#${inputId}`);
  const widget = input.closest<HTMLElement>(RANGE_WIDGET);
  if (!widget) throw new Error(`Missing ${RANGE_WIDGET} around #${inputId}`);
  return widget;
}

export function mountWindOverride(root: Document, store: WindFarmStore, inputId: string): Disposer {
  return mountRangeWidget(widgetAround(root, inputId), store, {
    control: WIND_OVERRIDE_CONTROL,
    range: WIND_OVERRIDE_RANGE,
    select: (state): SelectedWind => [liveWind(state)],
    value: ([wind]) => wind,
    format: ([wind]) => formatWind(wind),
    set: (state, wind) => state.setWindOverride(wind),
  });
}
