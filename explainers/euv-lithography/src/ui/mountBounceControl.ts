import type { Disposer } from '@core/ui/disposers';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { TEXT_REFRESH_INTERVAL_MS } from '@core/ui/throttle';
import { t } from '@core/i18n';
import { BOUNCES, REFLECTIVITY } from '../model';
import type { EuvStore } from '../state';
import { bounceCountOf, seekBounceCount } from './actions';
import { formatPercentOf } from './format';

type SelectedBounce = readonly [count: number];

export const BOUNCE_RANGE = { min: 0, max: BOUNCES, step: 1 } as const;

function lightLeft([count]: SelectedBounce): number {
  return REFLECTIVITY ** count;
}

export function mountBounceControl(root: Document, store: EuvStore): Disposer {
  return mountRangeWidget(root, store, {
    control: 'bounce',
    range: BOUNCE_RANGE,
    select: ({ phase }): SelectedBounce => [bounceCountOf(phase)],
    value: ([count]) => count,
    format: ([count]) => t('chapters.mirrors.bounce.output', { count }),
    set: seekBounceCount,
    refreshIntervalMs: TEXT_REFRESH_INTERVAL_MS,
    readouts: {
      bounceLight: (selected) => formatPercentOf(lightLeft(selected)),
      bounceLeft: (selected) => formatPercentOf(1 - lightLeft(selected)),
    },
  });
}
