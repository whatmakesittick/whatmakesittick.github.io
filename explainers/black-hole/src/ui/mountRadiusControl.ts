import { clamp } from '@core/math';
import type { Disposer } from '@core/ui/disposers';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { TEXT_REFRESH_INTERVAL_MS } from '@core/ui/throttle';
import { HORIZON_RADIUS, RELEASE_RADIUS } from '../model';
import { clocksOf, fallOf } from '../state';
import type { BlackHoleStore, Clocks } from '../state';
import {
  formatClock,
  formatDistance,
  formatFlashTone,
  formatRatioValue,
  formatShipClock,
} from './format';

type SelectedPhase = readonly [phase: number];

export const RADIUS_RANGE = { min: HORIZON_RADIUS, max: RELEASE_RADIUS, step: 0.05 } as const;

function radiusAt([phase]: SelectedPhase): number {
  return clamp(fallOf({ phase }).radius, RADIUS_RANGE.min, RADIUS_RANGE.max);
}

function clocksAt([phase]: SelectedPhase): Readonly<Clocks> {
  return clocksOf({ phase });
}

export function mountRadiusControl(root: Document, store: BlackHoleStore): Disposer {
  return mountRangeWidget(root, store, {
    control: 'radius',
    range: RADIUS_RANGE,
    select: (state): SelectedPhase => [state.phase],
    value: radiusAt,
    format: (selected) => formatDistance(radiusAt(selected)),
    set: (state, radius) => state.seekRadius(radius),
    refreshIntervalMs: TEXT_REFRESH_INTERVAL_MS,
    readouts: {
      'radius-probe': (selected) => formatClock(clocksAt(selected).probeClock),
      'radius-ship': (selected) => formatShipClock(clocksAt(selected).shipClock),
      'radius-ratio': (selected) => formatRatioValue(clocksAt(selected).ratio),
      'radius-flash': (selected) => formatFlashTone(clocksAt(selected).flashTone),
    },
  });
}
