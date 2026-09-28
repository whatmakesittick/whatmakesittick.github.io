import type { Readout } from '@core/explainer';
import {
  POWER_RESERVE_HOURS,
  balanceAngle,
  isInContact,
  isWithinCosc,
  timeOnDialSeconds,
} from '../model';
import { amplitudeOf, dailyRateOf } from '../state';
import type { WatchStoreState } from '../state';
import {
  formatDegrees,
  formatDialTime,
  formatHours,
  formatRate,
  formatSignedDegrees,
} from './format';
import {
  AMPLITUDE_METER_FILL,
  CONTACT_TONE,
  GOOD_RATE_TONE,
  NEUTRAL_TONE,
  RESERVE_METER_FILL,
  WARN_RATE_TONE,
} from './palette';

const AMPLITUDE_METER_MAX_DEG = 330;

export const WATCH_READOUTS: readonly Readout<WatchStoreState>[] = [
  {
    id: 'balance',
    labelKey: 'readouts.balance',
    numeric: true,
    value: (state) => formatSignedDegrees(balanceAngle(state.phase, amplitudeOf(state))),
    tone: (state) => (isInContact(state.phase, amplitudeOf(state)) ? CONTACT_TONE : NEUTRAL_TONE),
  },
  {
    id: 'amplitude',
    labelKey: 'readouts.amplitude',
    numeric: true,
    value: (state) => formatDegrees(amplitudeOf(state)),
    meter: {
      share: (state) => amplitudeOf(state) / AMPLITUDE_METER_MAX_DEG,
      fill: AMPLITUDE_METER_FILL,
    },
  },
  {
    id: 'time',
    labelKey: 'readouts.time',
    numeric: true,
    value: (state) => formatDialTime(timeOnDialSeconds(state.phase, state.cycles)),
  },
  {
    id: 'reserve',
    labelKey: 'readouts.reserve',
    numeric: true,
    value: (state) => formatHours(state.reserve),
    meter: { share: (state) => state.reserve / POWER_RESERVE_HOURS, fill: RESERVE_METER_FILL },
  },
  {
    id: 'rate',
    labelKey: 'readouts.rate',
    numeric: true,
    value: (state) => formatRate(dailyRateOf(state)),
    tone: (state) => (isWithinCosc(dailyRateOf(state)) ? GOOD_RATE_TONE : WARN_RATE_TONE),
  },
];
