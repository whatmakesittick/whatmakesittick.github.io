import { mountRangeWidget } from '@core/ui/rangeWidget';
import { dailyEnergyWh, incidenceAngleDeg, incidenceCosine, isSunUp } from '../model';
import { TILT_RANGE, irradianceOf, minuteOf } from '../state';
import type { SolarPanelState, SolarPanelStore } from '../state';
import type { Disposer } from './disposers';
import { NO_VALUE, formatDegrees, formatIrradiance, formatKilowattHours } from './format';

const FLAT_TILT_DEG = 0;

function incidenceOf(state: SolarPanelState): number | null {
  const minute = minuteOf(state);
  if (!isSunUp(minute) || incidenceCosine(minute, state.tilt) <= 0) return null;
  return Math.round(incidenceAngleDeg(minute, state.tilt));
}

export function mountTiltControl(root: Document, store: SolarPanelStore): Disposer {
  return mountRangeWidget(root, store, {
    control: 'tilt',
    range: TILT_RANGE,
    select: (state) => [state.tilt, Math.round(irradianceOf(state)), incidenceOf(state)] as const,
    value: ([tilt]) => tilt,
    format: ([tilt]) => formatDegrees(tilt),
    set: (state, tilt) => state.setTilt(tilt),
    readouts: {
      'tilt-incidence': ([, , incidence]) =>
        incidence === null ? NO_VALUE : formatDegrees(incidence),
      'tilt-irradiance': ([, irradiance]) => formatIrradiance(irradiance),
      'tilt-day': ([tilt]) => formatKilowattHours(dailyEnergyWh(tilt)),
      'tilt-flatDay': () => formatKilowattHours(dailyEnergyWh(FLAT_TILT_DEG)),
    },
  });
}
