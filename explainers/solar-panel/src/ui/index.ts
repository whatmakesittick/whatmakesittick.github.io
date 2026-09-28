import type { SolarPanelStore } from '../state';
import { disposeAll } from './disposers';
import type { Disposer } from './disposers';
import { mountExplodeControl } from './explodeControl';
import { mountInverterReadouts } from './inverterReadouts';
import { mountJunctionReadouts } from './junctionReadouts';
import { mountLayerReadouts } from './layerReadouts';
import { mountShadeControl } from './shadeControl';
import { mountTemperatureControl } from './temperatureControl';
import { mountTiltControl } from './tiltControl';
import { mountWavelengthControl } from './wavelengthControl';

export { CHAPTER_ACTIONS } from './actions';
export { SOLAR_PANEL_CHOICES, VIEW_TOGGLES } from './dock';
export { SOLAR_PANEL_READOUTS } from './readouts';

export function mountSolarPanelUi(root: Document, store: SolarPanelStore): Disposer {
  return disposeAll([
    mountTiltControl(root, store),
    mountExplodeControl(root, store),
    mountLayerReadouts(root, store),
    mountWavelengthControl(root, store),
    mountJunctionReadouts(root, store),
    mountShadeControl(root, store),
    mountTemperatureControl(root, store),
    mountInverterReadouts(root, store),
  ]);
}
