import type { Readout } from '@core/explainer';
import { FARM_RATED_KW, RATED_KW } from '../model';
import { WIND_OVERRIDE_RANGE, liveReading } from '../state';
import type { WindFarmStoreState } from '../state';
import { THEME } from '../theme';
import { formatFarmMw, formatTurbineMw, formatWind } from './format';

export const WIND_FARM_READOUTS: readonly Readout<WindFarmStoreState>[] = [
  {
    id: 'wind',
    labelKey: 'readouts.wind',
    numeric: true,
    value: (state) => formatWind(liveReading(state).wind),
    meter: {
      share: (state) => liveReading(state).wind / WIND_OVERRIDE_RANGE.max,
      fill: THEME.wind,
    },
  },
  {
    id: 'power',
    labelKey: 'readouts.power',
    numeric: true,
    value: (state) => formatTurbineMw(liveReading(state).heroKw),
    meter: { share: (state) => liveReading(state).heroKw / RATED_KW, fill: THEME.afternoon },
  },
  {
    id: 'farm',
    labelKey: 'readouts.farm',
    numeric: true,
    value: (state) => formatFarmMw(liveReading(state).farmKw),
    meter: { share: (state) => liveReading(state).farmKw / FARM_RATED_KW, fill: THEME.cable },
  },
];
