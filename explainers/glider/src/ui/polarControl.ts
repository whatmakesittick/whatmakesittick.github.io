import { mountRangeWidget } from '@core/ui/rangeWidget';
import { POLAR_SPEED, glideRatio, sinkRate } from '../model';
import type { GliderStore } from '../state';
import { formatRate, formatRatio, formatReach, formatSpeed } from './format';

export function mountPolarControl(root: Document, store: GliderStore): void {
  mountRangeWidget(root, store, {
    control: 'polar-speed',
    range: POLAR_SPEED,
    select: (state) => [state.glider, state.polarSpeed] as const,
    value: ([, kmh]) => kmh,
    format: ([, kmh]) => formatSpeed(kmh),
    set: (state, kmh) => state.setPolarSpeed(kmh),
    readouts: {
      'polar-sink': ([type, kmh]) => formatRate(sinkRate(type, kmh)),
      'polar-ratio': ([type, kmh]) => formatRatio(glideRatio(type, kmh)),
      'polar-distance': ([type, kmh]) => formatReach(glideRatio(type, kmh)),
    },
  });
}
