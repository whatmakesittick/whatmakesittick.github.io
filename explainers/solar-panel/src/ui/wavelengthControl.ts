import { requireElement } from '@core/ui/dom';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { absorptionDepthUm, excessEnergyEv, photonEnergyEv } from '../model';
import { WAVELENGTH_RANGE } from '../state';
import type { SolarPanelStore } from '../state';
import type { Disposer } from './disposers';
import {
  formatAbsorption,
  formatBand,
  formatElectronVolts,
  formatHeat,
  formatNanometres,
} from './format';
import { SpectrumView } from './spectrumView';

export function mountWavelengthControl(root: Document, store: SolarPanelStore): Disposer {
  const view = new SpectrumView(requireElement<HTMLCanvasElement>(root, '[data-view="spectrum"]'));
  const unmount = mountRangeWidget(root, store, {
    control: 'wavelength',
    range: WAVELENGTH_RANGE,
    select: (state) => [state.wavelength] as const,
    value: ([wavelength]) => wavelength,
    format: ([wavelength]) => formatNanometres(wavelength),
    set: (state, wavelength) => state.setWavelength(wavelength),
    readouts: {
      'wavelength-energy': ([wavelength]) => formatElectronVolts(photonEnergyEv(wavelength)),
      'wavelength-band': ([wavelength]) => formatBand(wavelength),
      'wavelength-depth': ([wavelength]) =>
        formatAbsorption(wavelength, absorptionDepthUm(wavelength)),
      'wavelength-heat': ([wavelength]) => formatHeat(wavelength, excessEnergyEv(wavelength)),
    },
    after: ([wavelength]) => view.draw(wavelength),
  });
  return () => {
    unmount();
    view.dispose();
  };
}
