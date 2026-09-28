import { requireElement, setText } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import { acPowerW, laptopCharges } from '../model';
import { energyOf, powerOf } from '../state';
import type { SolarPanelState, SolarPanelStore } from '../state';
import { disposeAll } from './disposers';
import type { Disposer } from './disposers';
import { formatCount, formatKilowattHours, formatWatts } from './format';

const ENERGY_STEP_WH = 10;

function dcOf(state: SolarPanelState): number {
  return Math.round(powerOf(state));
}

function acOf(state: SolarPanelState): number {
  return Math.round(acPowerW(powerOf(state)));
}

function energyShownOf(state: SolarPanelState): number {
  return Math.round(energyOf(state) / ENERGY_STEP_WH) * ENERGY_STEP_WH;
}

function chargesOf(state: SolarPanelState): number {
  return Math.round(laptopCharges(energyOf(state)));
}

export function mountInverterReadouts(root: Document, store: SolarPanelStore): Disposer {
  const dc = requireElement(root, '[data-readout="inverter-dc"]');
  const ac = requireElement(root, '[data-readout="inverter-ac"]');
  const today = requireElement(root, '[data-readout="inverter-today"]');
  const powers = requireElement(root, '[data-readout="inverter-powers"]');
  return disposeAll([
    watchLocalized(store, dcOf, (watts) => setText(dc, formatWatts(watts))),
    watchLocalized(store, acOf, (watts) => setText(ac, formatWatts(watts))),
    watchLocalized(store, energyShownOf, (wattHours) =>
      setText(today, formatKilowattHours(wattHours)),
    ),
    watchLocalized(store, chargesOf, (charges) => setText(powers, formatCount(charges))),
  ]);
}
