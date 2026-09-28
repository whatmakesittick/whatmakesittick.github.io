import type { Readout } from '@core/explainer';
import { clamp } from '@core/math';
import { OBJECTIVES, fieldOfView, smallestDetail, totalMagnification } from '../model';
import type { MicroscopeState, MicroscopeStoreState } from '../state';
import { formatAperture, formatDetail, formatField, formatTimes } from './format';
import { RESOLUTION_METER_FILL } from './palette';

const METER_FLOOR_UM = 3;

function detail(state: MicroscopeState): number {
  return smallestDetail(state.objective, state.wavelength);
}

export const MICROSCOPE_READOUTS: readonly Readout<MicroscopeStoreState>[] = [
  {
    id: 'magnification',
    labelKey: 'readouts.magnification',
    numeric: true,
    value: (state) => formatTimes(totalMagnification(state.objective, state.eyepiece)),
  },
  {
    id: 'aperture',
    labelKey: 'readouts.aperture',
    numeric: true,
    value: (state) => formatAperture(OBJECTIVES[state.objective].numericalAperture),
  },
  {
    id: 'resolution',
    labelKey: 'readouts.resolution',
    numeric: true,
    value: (state) => formatDetail(detail(state)),
    meter: {
      share: (state) => clamp(1 - detail(state) / METER_FLOOR_UM, 0, 1),
      fill: RESOLUTION_METER_FILL,
    },
  },
  {
    id: 'field',
    labelKey: 'readouts.field',
    numeric: true,
    value: (state) => formatField(fieldOfView(state.objective)),
  },
];
