import type { Readout } from '@core/explainer';
import { t } from '@core/i18n';
import { MAX_CHAIN_SPEED_MS, MAX_POWER_RPM, phaseOf } from '../model';
import { liveReading } from '../state';
import type { ChainsawStoreState } from '../state';
import { CLUTCH_TONES, ENGINE_TONES, PHASE_TONES, THEME } from '../theme';
import { formatClutch, formatEngineSpeed, formatSpeedMs } from './format';

export const CHAINSAW_READOUTS: readonly Readout<ChainsawStoreState>[] = [
  {
    id: 'rpm',
    labelKey: 'readouts.rpm',
    numeric: true,
    value: (state) => formatEngineSpeed(state.engine, liveReading(state).rpm),
    tone: (state) => ENGINE_TONES[state.engine],
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
  {
    id: 'phase',
    labelKey: 'readouts.phase',
    numeric: false,
    value: (state) => t(`timeline.phase.${phaseOf(state.phase)}`),
    tone: (state) => PHASE_TONES[phaseOf(state.phase)],
  },
];
