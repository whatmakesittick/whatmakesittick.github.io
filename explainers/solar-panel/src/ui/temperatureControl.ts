import { clamp } from '@core/math';
import type { Disposer } from '@core/ui/disposers';
import { requireElement } from '@core/ui/dom';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { temperatureFactor, vocAt } from '../model';
import { TEMPERATURE_RANGE, cellTemperatureOf, irradianceOf } from '../state';
import type { SolarPanelState, SolarPanelStore } from '../state';
import { NO_VALUE, formatCelsius, formatSignedPercent, formatVolts } from './format';

const FOLLOW_CHIP = '.chip[data-action="followDay"]';
const TENTHS = 10;

function shownTemperature(state: SolarPanelState): number {
  const celsius = clamp(cellTemperatureOf(state), TEMPERATURE_RANGE.min, TEMPERATURE_RANGE.max);
  return Math.round(celsius);
}

function shownVoc(state: SolarPanelState): number | null {
  const irradiance = irradianceOf(state);
  if (irradiance <= 0) return null;
  return Math.round(vocAt(irradiance, cellTemperatureOf(state)) * TENTHS) / TENTHS;
}

export function mountTemperatureControl(root: Document, store: SolarPanelStore): Disposer {
  const followChip = requireElement(root, FOLLOW_CHIP);
  return mountRangeWidget(root, store, {
    control: 'temperature',
    range: TEMPERATURE_RANGE,
    select: (state) =>
      [shownTemperature(state), state.temperature === null, shownVoc(state)] as const,
    value: ([celsius]) => celsius,
    format: ([celsius]) => formatCelsius(celsius),
    set: (state, celsius) => state.setTemperature(celsius),
    readouts: {
      'temperature-loss': ([celsius]) => formatSignedPercent(temperatureFactor(celsius) - 1),
      'temperature-voltage': ([, , voc]) => (voc === null ? NO_VALUE : formatVolts(voc)),
    },
    after: ([, followsDay]) => {
      followChip.setAttribute('aria-disabled', String(followsDay));
    },
  });
}
