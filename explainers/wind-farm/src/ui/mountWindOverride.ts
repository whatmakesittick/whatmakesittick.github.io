import type { Disposer } from '@core/ui/disposers';
import { requireElement } from '@core/ui/dom';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { WIND_OVERRIDE_RANGE, liveWind } from '../state';
import type { WindFarmStore } from '../state';
import { formatWind } from './format';

const WIND_OVERRIDE_CONTROL = 'wind-override';

type SelectedWind = readonly [wind: number];

export function mountWindOverride(root: Document, store: WindFarmStore, inputId: string): Disposer {
  const input = requireElement<HTMLInputElement>(root, `#${inputId}`);
  return mountRangeWidget(input.parentElement ?? root, store, {
    control: WIND_OVERRIDE_CONTROL,
    range: WIND_OVERRIDE_RANGE,
    select: (state): SelectedWind => [liveWind(state)],
    value: ([wind]) => wind,
    format: ([wind]) => formatWind(wind),
    set: (state, wind) => state.setWindOverride(wind),
  });
}
