import type { Readout } from '@core/explainer';
import { MODULE_SPEC, STANDARD_TEST, sunElevationDeg } from '../model';
import { cellTemperatureOf, energyOf, irradianceOf, minuteOf, powerOf } from '../state';
import type { SolarPanelStoreState } from '../state';
import {
  formatCelsius,
  formatEnergyToday,
  formatIrradiance,
  formatSunElevation,
  formatWatts,
} from './format';
import {
  HIGH_SUN_TONE,
  HOT_CELL_TONE,
  IRRADIANCE_METER_FILL,
  LOW_SUN_TONE,
  NEUTRAL_TONE,
  POWER_METER_FILL,
} from './palette';

export const LOW_SUN_DEG = 10;
export const HIGH_SUN_DEG = 40;
export const HOT_CELL_C = 60;

function elevationOf(state: SolarPanelStoreState): number {
  return sunElevationDeg(minuteOf(state));
}

function sunTone(state: SolarPanelStoreState): string {
  const elevation = elevationOf(state);
  if (elevation < LOW_SUN_DEG) return LOW_SUN_TONE;
  if (elevation > HIGH_SUN_DEG) return HIGH_SUN_TONE;
  return NEUTRAL_TONE;
}

export const SOLAR_PANEL_READOUTS: readonly Readout<SolarPanelStoreState>[] = [
  {
    id: 'sun',
    labelKey: 'readouts.sun',
    numeric: true,
    value: (state) => formatSunElevation(elevationOf(state)),
    tone: sunTone,
  },
  {
    id: 'irradiance',
    labelKey: 'readouts.irradiance',
    numeric: true,
    value: (state) => formatIrradiance(irradianceOf(state)),
    meter: {
      share: (state) => irradianceOf(state) / STANDARD_TEST.irradiance,
      fill: IRRADIANCE_METER_FILL,
    },
  },
  {
    id: 'power',
    labelKey: 'readouts.power',
    numeric: true,
    value: (state) => formatWatts(powerOf(state)),
    meter: { share: (state) => powerOf(state) / MODULE_SPEC.powerW, fill: POWER_METER_FILL },
  },
  {
    id: 'temperature',
    labelKey: 'readouts.temperature',
    numeric: true,
    value: (state) => formatCelsius(cellTemperatureOf(state)),
    tone: (state) => (cellTemperatureOf(state) > HOT_CELL_C ? HOT_CELL_TONE : NEUTRAL_TONE),
  },
  {
    id: 'energy',
    labelKey: 'readouts.energy',
    numeric: true,
    value: (state) => formatEnergyToday(energyOf(state)),
  },
];
