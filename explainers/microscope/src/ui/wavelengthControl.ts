import { mountRangeWidget } from '@core/ui/rangeWidget';
import {
  OBJECTIVES,
  WAVELENGTH,
  smallestDetail,
  spectralColor,
  usefulMagnification,
} from '../model';
import type { MicroscopeStore } from '../state';
import { cssColor } from './colors';
import { formatDetail, formatNanometres, formatTimes } from './format';

const WAVELENGTH_PROPERTY = '--wavelength';

export function mountWavelengthControl(root: Document, store: MicroscopeStore): void {
  mountRangeWidget(root, store, {
    control: 'wavelength',
    range: WAVELENGTH,
    select: (state) => [state.wavelength, state.objective] as const,
    value: ([wavelength]) => wavelength,
    format: ([wavelength]) => formatNanometres(wavelength),
    set: (state, wavelength) => state.setWavelength(wavelength),
    readouts: {
      'limit-detail': ([wavelength, objective]) =>
        formatDetail(smallestDetail(objective, wavelength)),
      'limit-useful': ([, objective]) =>
        formatTimes(usefulMagnification(OBJECTIVES[objective].numericalAperture).max),
    },
    after: ([wavelength], _state, widget) =>
      widget.style.setProperty(WAVELENGTH_PROPERTY, cssColor(spectralColor(wavelength))),
  });
}
