import type { Readout } from '@core/explainer';
import { t } from '@core/i18n';
import { clamp } from '@core/math';
import { MOUTH_C, SERVING_RANGE_C, SWALLOW_S } from '../model';
import { flavorReading } from '../state';
import type { FlavorStoreState } from '../state';
import { PHASE_TONES, THEME } from '../theme';
import { formatCelsius, formatPercent } from './format';
import { perceptText } from './text';

const METER_LOW_C = SERVING_RANGE_C.min;
const METER_SPAN_C = MOUTH_C - METER_LOW_C;

export function temperatureShare(celsius: number): number {
  return clamp((celsius - METER_LOW_C) / METER_SPAN_C, 0, 1);
}

export function formatBiteTemperature(state: FlavorStoreState): string {
  const { seconds, temperatureC } = flavorReading(state);
  if (seconds >= SWALLOW_S) return t('readouts.swallowed');
  return formatCelsius(temperatureC);
}

export const FLAVOR_READOUTS: readonly Readout<FlavorStoreState>[] = [
  {
    id: 'temperature',
    labelKey: 'readouts.temperature',
    numeric: true,
    value: formatBiteTemperature,
    meter: {
      share: (state) => temperatureShare(flavorReading(state).temperatureC),
      fill: THEME.frost,
    },
  },
  {
    id: 'aroma',
    labelKey: 'readouts.aroma',
    numeric: true,
    value: (state) => formatPercent(flavorReading(state).released),
    meter: { share: (state) => flavorReading(state).released, fill: THEME.cherry },
  },
  {
    id: 'perceived',
    labelKey: 'readouts.perceived',
    numeric: false,
    value: (state) => perceptText(flavorReading(state)),
    tone: (state) => PHASE_TONES[flavorReading(state).phase],
  },
];
