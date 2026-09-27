import type { Readout } from '@core/explainer';
import { LOOP_PEAK_LENGTH, fabricTravel, hookAngle, loopLength, needleTipHeight } from '../model';
import type { SewingState, SewingStoreState } from '../state';
import { formatDegrees, formatMillimetres } from './format';
import { FEED_METER_FILL, LOOP_METER_FILL } from './palette';

function currentLoop(state: SewingState): number {
  return loopLength(state.phase, state.tension);
}

function currentTravel(state: SewingState): number {
  return fabricTravel(state.phase, state.stitchLength);
}

export const SEWING_READOUTS: readonly Readout<SewingStoreState>[] = [
  {
    id: 'needle',
    labelKey: 'readouts.needle',
    numeric: true,
    value: (state) => formatMillimetres(needleTipHeight(state.phase)),
  },
  {
    id: 'hook',
    labelKey: 'readouts.hook',
    numeric: true,
    value: (state) => formatDegrees(hookAngle(state.phase)),
  },
  {
    id: 'loop',
    labelKey: 'readouts.loop',
    numeric: true,
    value: (state) => formatMillimetres(currentLoop(state)),
    meter: {
      share: (state) => Math.min(1, currentLoop(state) / LOOP_PEAK_LENGTH),
      fill: LOOP_METER_FILL,
    },
  },
  {
    id: 'feed',
    labelKey: 'readouts.feed',
    numeric: true,
    value: (state) => formatMillimetres(currentTravel(state)),
    meter: {
      share: (state) => currentTravel(state) / state.stitchLength,
      fill: FEED_METER_FILL,
    },
  },
];
