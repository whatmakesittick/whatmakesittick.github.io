import type { Disposer } from '@core/ui/disposers';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { EXPLODE_RANGE } from '../state';
import type { SolarPanelStore } from '../state';
import { formatPercent } from './format';

export function mountExplodeControl(root: Document, store: SolarPanelStore): Disposer {
  return mountRangeWidget(root, store, {
    control: 'explode',
    range: EXPLODE_RANGE,
    select: (state) => [state.explode] as const,
    value: ([explode]) => explode,
    format: ([explode]) => formatPercent(explode),
    set: (state, explode) => state.setExplode(explode),
  });
}
