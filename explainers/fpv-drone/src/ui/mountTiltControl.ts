import type { Disposer } from '@core/ui/disposers';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import {
  SPRINT_KMH,
  TILT_RANGE,
  accelerationAt,
  accelerationInG,
  secondsToKmh,
  thrustShareAt,
} from '../model';
import type { FpvStore } from '../state';
import { formatDegrees, formatOfHover, formatPush, formatSeconds } from './format';

type SelectedTilt = readonly [tilt: number];

export function mountTiltControl(root: Document, store: FpvStore): Disposer {
  return mountRangeWidget(root, store, {
    control: 'tilt',
    range: TILT_RANGE,
    select: (state): SelectedTilt => [state.tilt],
    value: ([tilt]) => tilt,
    format: ([tilt]) => formatDegrees(tilt),
    set: (state, tilt) => state.setTilt(tilt),
    readouts: {
      'tilt-push': ([tilt]) => formatPush(accelerationAt(tilt), accelerationInG(tilt)),
      'tilt-thrust': ([tilt]) => formatOfHover(thrustShareAt(tilt)),
      'tilt-sprint': ([tilt]) => formatSeconds(secondsToKmh(tilt, SPRINT_KMH)),
    },
  });
}
