import { mountRangeWidget } from '@core/ui/rangeWidget';
import { SPREAD, roundedCloudBase } from '../model';
import type { GliderStore } from '../state';
import { formatCelsius, formatMetres } from './format';

export function mountCloudControl(root: Document, store: GliderStore): void {
  mountRangeWidget(root, store, {
    control: 'spread',
    range: SPREAD,
    select: (state) => [state.spread] as const,
    value: ([degrees]) => degrees,
    format: ([degrees]) => formatCelsius(degrees),
    set: (state, degrees) => state.setSpread(degrees),
    readouts: { 'cloud-base': ([degrees]) => formatMetres(roundedCloudBase(degrees)) },
  });
}
