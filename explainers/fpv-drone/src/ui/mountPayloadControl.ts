import type { Disposer } from '@core/ui/disposers';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { PAYLOAD_RANGE, allUpG, flightMinutes, thrustToWeight } from '../model';
import type { FpvStore } from '../state';
import { formatGrams, formatHoverThrottle, formatMinutes, formatRatio } from './format';

type SelectedPayload = readonly [payload: number];

export function mountPayloadControl(root: Document, store: FpvStore): Disposer {
  return mountRangeWidget(root, store, {
    control: 'payload',
    range: PAYLOAD_RANGE,
    select: (state): SelectedPayload => [state.payload],
    value: ([payload]) => payload,
    format: ([payload]) => formatGrams(payload),
    set: (state, payload) => state.setPayload(payload),
    readouts: {
      'power-weight': ([payload]) => formatGrams(allUpG(payload)),
      'power-twr': ([payload]) => formatRatio(thrustToWeight(payload)),
      'power-hover': ([payload]) => formatHoverThrottle(payload),
      'power-minutes': ([payload]) => formatMinutes(flightMinutes(payload)),
    },
  });
}
