import type { Readout } from '@core/explainer';
import { t } from '@core/i18n';
import { clockReading } from '../state';
import type { ClockStoreState } from '../state';
import { PHASE_TONES, THEME } from '../theme';
import { bisulfiteShare, formatClock, formatIodine, formatMillimolar } from './format';

export function formatIodineNow(state: ClockStoreState): string {
  const { iodineM, seconds, switchSeconds } = clockReading(state);
  return formatIodine(iodineM, seconds, switchSeconds);
}

export const CLOCK_READOUTS: readonly Readout<ClockStoreState>[] = [
  {
    id: 'clock',
    labelKey: 'readouts.clock',
    numeric: true,
    value: (state) => {
      const { seconds, switchSeconds } = clockReading(state);
      return formatClock(seconds, switchSeconds);
    },
  },
  {
    id: 'bisulfite',
    labelKey: 'readouts.bisulfite',
    numeric: true,
    value: (state) => formatMillimolar(clockReading(state).bisulfiteM),
    meter: {
      share: (state) => bisulfiteShare(clockReading(state).bisulfiteM),
      fill: THEME.sulfur,
    },
  },
  {
    id: 'iodine',
    labelKey: 'readouts.iodine',
    numeric: true,
    value: formatIodineNow,
    meter: { share: (state) => clockReading(state).colour, fill: THEME.blueBlack },
  },
  {
    id: 'now',
    labelKey: 'readouts.now',
    numeric: false,
    value: (state) => t(`timeline.detail.${clockReading(state).phase}`),
    tone: (state) => PHASE_TONES[clockReading(state).phase],
  },
];
