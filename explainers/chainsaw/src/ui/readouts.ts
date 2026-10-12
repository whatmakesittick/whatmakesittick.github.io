import type { Readout } from '@core/explainer';
import { MAX_CHAIN_SPEED_MS, MAX_POWER_RPM } from '../model';
import { liveReading } from '../state';
import type { ChainsawStoreState } from '../state';
import { CLUTCH_TONES, THEME } from '../theme';
import { formatClutch, formatRpm, formatSpeedMs } from './format';

export const CHAINSAW_READOUTS: readonly Readout<ChainsawStoreState>[] = [
  {
    id: 'rpm',
    labelKey: 'readouts.rpm',
    numeric: true,
    value: (state) => formatRpm(liveReading(state).rpm),
    meter: { share: (state) => liveReading(state).rpm / MAX_POWER_RPM, fill: THEME.power },
  },
  {
    id: 'chain',
    labelKey: 'readouts.chain',
    numeric: true,
    value: (state) => formatSpeedMs(liveReading(state).chainSpeed),
    meter: {
      share: (state) => liveReading(state).chainSpeed / MAX_CHAIN_SPEED_MS,
      fill: THEME.chainSteel,
    },
  },
  {
    id: 'clutch',
    labelKey: 'readouts.clutch',
    numeric: false,
    value: (state) => formatClutch(liveReading(state).clutch),
    tone: (state) => CLUTCH_TONES[liveReading(state).clutch],
  },
];
