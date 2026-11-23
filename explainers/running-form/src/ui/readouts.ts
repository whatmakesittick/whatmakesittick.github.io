import type { Readout } from '@core/explainer';
import { clamp } from '@core/math';
import { gaitReading } from '../state';
import type { RunStoreState } from '../state';
import { THEME } from '../theme';
import {
  formatBodyWeights,
  formatDegrees,
  formatMeters,
  formatMilliseconds,
  formatPerMinute,
} from './format';
import { feetText } from './text';

export const FORCE_METER_MAX_BW = 3;
export const KNEE_METER_MAX_DEG = 120;

function share(value: number, max: number): number {
  return clamp(value / max, 0, 1);
}

export const RUN_READOUTS: readonly Readout<RunStoreState>[] = [
  {
    id: 'feet',
    labelKey: 'readouts.feet',
    numeric: false,
    value: (state) => feetText(gaitReading(state).force),
  },
  {
    id: 'force',
    labelKey: 'readouts.force',
    numeric: true,
    value: (state) => formatBodyWeights(gaitReading(state).force.vertBW),
    meter: {
      share: (state) => share(gaitReading(state).force.vertBW, FORCE_METER_MAX_BW),
      fill: THEME.forceArrow,
    },
  },
  {
    id: 'knee',
    labelKey: 'readouts.knee',
    numeric: true,
    value: (state) => formatDegrees(gaitReading(state).right.kneeFlexDeg),
    meter: {
      share: (state) => share(gaitReading(state).right.kneeFlexDeg, KNEE_METER_MAX_DEG),
      fill: THEME.landing,
    },
  },
  {
    id: 'cadence',
    labelKey: 'readouts.cadence',
    numeric: true,
    value: (state) => formatPerMinute(gaitReading(state).timing.cadence),
  },
  {
    id: 'stepLength',
    labelKey: 'readouts.stepLength',
    numeric: true,
    value: (state) => formatMeters(gaitReading(state).timing.stepLengthM),
  },
  {
    id: 'contact',
    labelKey: 'readouts.contact',
    numeric: true,
    value: (state) => formatMilliseconds(gaitReading(state).timing.contactTimeS),
  },
];
