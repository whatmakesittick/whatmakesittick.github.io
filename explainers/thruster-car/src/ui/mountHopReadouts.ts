import { toRadians } from '@core/math';
import type { Disposer } from '@core/ui/disposers';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { RAMP, airTime, peakHeight, range } from '../model';
import { CALCULATOR_RANGES } from '../state';
import type { ThrusterCarStore } from '../state';
import { TENTHS, WHOLE, formatMetres, formatSeconds, formatSpeedMs } from './format';

const LAUNCH_SPEED_CONTROL = 'launchSpeed';
const EXIT_ANGLE_RAD = toRadians(RAMP.exitAngleDeg);

type SelectedLaunch = readonly [launchSpeed: number];

export function mountHopReadouts(root: Document, store: ThrusterCarStore): Disposer {
  return mountRangeWidget(root, store, {
    control: LAUNCH_SPEED_CONTROL,
    range: CALCULATOR_RANGES.launchSpeed,
    select: (state): SelectedLaunch => [state.launchSpeed],
    value: ([speed]) => speed,
    format: ([speed]) => formatSpeedMs(speed, TENTHS),
    set: (state, speed) => state.setLaunchSpeed(speed),
    readouts: {
      peakHeight: ([speed]) =>
        formatMetres(peakHeight(speed, EXIT_ANGLE_RAD, RAMP.exitHeight), TENTHS),
      airTime: ([speed]) => formatSeconds(airTime(speed, EXIT_ANGLE_RAD, RAMP.exitHeight), TENTHS),
      hopRange: ([speed]) => formatMetres(range(speed, EXIT_ANGLE_RAD, RAMP.exitHeight), WHOLE),
    },
  });
}
