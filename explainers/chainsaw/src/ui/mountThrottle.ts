import type { Disposer } from '@core/ui/disposers';
import { requireElement } from '@core/ui/dom';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import type { RangeReadout } from '@core/ui/rangeWidget';
import type { EngineStateId } from '../ids';
import { THROTTLE_RANGE } from '../model';
import { liveReading } from '../state';
import type { ChainsawStore, ChainsawStoreState, LiveReading } from '../state';
import { formatClutch, formatPercent, formatRpm, formatSpeedPair } from './format';

const THROTTLE_CONTROL = 'throttle';
const RANGE_WIDGET = '.range-widget';

type SelectedThrottle = readonly [throttle: number, brake: boolean, engine: EngineStateId];

export interface ThrottleReadoutIds {
  rpm: string;
  chain: string;
  clutch?: string;
}

function widgetAround(root: Document, inputId: string): HTMLElement {
  const input = requireElement<HTMLInputElement>(root, `#${inputId}`);
  const widget = input.closest<HTMLElement>(RANGE_WIDGET);
  if (!widget) throw new Error(`Missing ${RANGE_WIDGET} around #${inputId}`);
  return widget;
}

function reading([throttle, brake, engine]: SelectedThrottle): LiveReading {
  return liveReading({ throttle, brake, engine });
}

function readoutsOf(
  ids: ThrottleReadoutIds,
): Record<string, RangeReadout<ChainsawStoreState, SelectedThrottle>> {
  const readouts: Record<string, RangeReadout<ChainsawStoreState, SelectedThrottle>> = {
    [ids.rpm]: (selected) => formatRpm(reading(selected).rpm),
    [ids.chain]: (selected) => formatSpeedPair(reading(selected).chainSpeed),
  };
  if (ids.clutch) readouts[ids.clutch] = (selected) => formatClutch(reading(selected).clutch);
  return readouts;
}

export function mountThrottle(
  root: Document,
  store: ChainsawStore,
  inputId: string,
  readoutIds: ThrottleReadoutIds,
): Disposer {
  return mountRangeWidget(widgetAround(root, inputId), store, {
    control: THROTTLE_CONTROL,
    range: THROTTLE_RANGE,
    select: (state): SelectedThrottle => [state.throttle, state.brake, state.engine],
    value: ([throttle]) => throttle,
    format: ([throttle]) => formatPercent(throttle),
    set: (state, throttle) => state.setThrottle(throttle),
    readouts: readoutsOf(readoutIds),
  });
}
