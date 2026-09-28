import type { Readout } from '@core/explainer';
import {
  campaignDay,
  depthBelowSeabed,
  mudPressureBar,
  mudWindowShare,
  temperatureAtC,
} from '../model';
import { effectiveMudWeight, mudStateOf } from '../state';
import type { OilRigStoreState } from '../state';
import { formatBar, formatCelsius, formatDay, formatMetres } from './format';
import { MUD_STATE_TONES, PRESSURE_METER_FILL } from './palette';

export const OIL_RIG_READOUTS: readonly Readout<OilRigStoreState>[] = [
  {
    id: 'belowSeabed',
    labelKey: 'readouts.belowSeabed',
    numeric: true,
    value: (state) => formatMetres(Math.max(0, depthBelowSeabed(state.phase))),
  },
  {
    id: 'pressure',
    labelKey: 'readouts.pressure',
    numeric: true,
    value: (state) => formatBar(mudPressureBar(state.phase, effectiveMudWeight(state))),
    tone: (state) => MUD_STATE_TONES[mudStateOf(state)],
    meter: {
      share: (state) => mudWindowShare(state.phase, effectiveMudWeight(state)),
      fill: PRESSURE_METER_FILL,
    },
  },
  {
    id: 'temperature',
    labelKey: 'readouts.temperature',
    numeric: true,
    value: (state) => formatCelsius(temperatureAtC(state.phase)),
  },
  {
    id: 'day',
    labelKey: 'readouts.day',
    numeric: true,
    value: (state) => formatDay(campaignDay(state.phase, state.bit)),
  },
];
