import type { Readout } from '@core/explainer';
import { conductionSite } from '../model';
import { pressuresOf, timeOf, valveStateOf, volumeOf } from '../state';
import type { HeartStoreState } from '../state';
import { formatMl, formatMmHg, formatSignal, formatValveState } from './format';
import {
  AORTIC_PRESSURE_METER_FILL,
  EJECTING_TONE,
  NEUTRAL_TONE,
  VENTRICLE_PRESSURE_METER_FILL,
  VOLUME_METER_FILL,
} from './palette';

export const PRESSURE_FULL_SCALE_MMHG = 140;
const VOLUME_FULL_SCALE_ML = 140;
const EJECTING_MMHG = 80;

function ventriclePressure(state: HeartStoreState): number {
  return pressuresOf(state).leftVentricle;
}

function aortaPressure(state: HeartStoreState): number {
  return pressuresOf(state).aorta;
}

export const HEART_READOUTS: readonly Readout<HeartStoreState>[] = [
  {
    id: 'lvPressure',
    labelKey: 'readouts.lvPressure',
    numeric: true,
    value: (state) => formatMmHg(ventriclePressure(state)),
    tone: (state) => (ventriclePressure(state) > EJECTING_MMHG ? EJECTING_TONE : NEUTRAL_TONE),
    meter: {
      share: (state) => ventriclePressure(state) / PRESSURE_FULL_SCALE_MMHG,
      fill: VENTRICLE_PRESSURE_METER_FILL,
    },
  },
  {
    id: 'aorticPressure',
    labelKey: 'readouts.aorticPressure',
    numeric: true,
    value: (state) => formatMmHg(aortaPressure(state)),
    meter: {
      share: (state) => aortaPressure(state) / PRESSURE_FULL_SCALE_MMHG,
      fill: AORTIC_PRESSURE_METER_FILL,
    },
  },
  {
    id: 'lvVolume',
    labelKey: 'readouts.lvVolume',
    numeric: true,
    value: (state) => formatMl(volumeOf(state)),
    meter: {
      share: (state) => volumeOf(state) / VOLUME_FULL_SCALE_ML,
      fill: VOLUME_METER_FILL,
    },
  },
  {
    id: 'valves',
    labelKey: 'readouts.valves',
    numeric: false,
    value: (state) => formatValveState(valveStateOf(state)),
  },
  {
    id: 'signal',
    labelKey: 'readouts.signal',
    numeric: false,
    value: (state) => formatSignal(conductionSite(timeOf(state))),
  },
];
