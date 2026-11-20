import type { Readout } from '@core/explainer';
import { clamp } from '@core/math';
import { spoolsNow, thrustNow } from '../state';
import type { EngineStoreState } from '../state';
import { THEME } from '../theme';
import { describeAirPosition } from '../timeline';
import { formatPercent, formatThrust } from './format';

export const ENGINE_READOUTS: readonly Readout<EngineStoreState>[] = [
  {
    id: 'position',
    labelKey: 'readouts.position',
    numeric: false,
    value: (state) => describeAirPosition(state.phase),
  },
  {
    id: 'fan',
    labelKey: 'readouts.fan',
    numeric: true,
    value: (state) => formatPercent(spoolsNow(state).fan),
    meter: { share: (state) => spoolsNow(state).fan, fill: THEME.cool },
  },
  {
    id: 'core',
    labelKey: 'readouts.core',
    numeric: true,
    value: (state) => formatPercent(spoolsNow(state).core),
    meter: { share: (state) => spoolsNow(state).core, fill: THEME.ember },
  },
  {
    id: 'thrust',
    labelKey: 'readouts.thrust',
    numeric: true,
    value: (state) => formatThrust(thrustNow(state)),
    meter: { share: (state) => clamp(Math.abs(thrustNow(state)), 0, 1), fill: THEME.exhaust },
  },
];
