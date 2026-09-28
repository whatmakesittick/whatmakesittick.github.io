import type { SolarPanelStore } from '../state';
import { disposeAll } from './disposers';
import type { Disposer } from './disposers';
import { mountExplodeControl } from './explodeControl';
import { mountLayerReadouts } from './layerReadouts';
import { mountTiltControl } from './tiltControl';

export { CHAPTER_ACTIONS } from './actions';
export { SOLAR_PANEL_CHOICES, VIEW_TOGGLES } from './dock';
export { SOLAR_PANEL_READOUTS } from './readouts';

export function mountSolarPanelUi(root: Document, store: SolarPanelStore): Disposer {
  return disposeAll([
    mountTiltControl(root, store),
    mountExplodeControl(root, store),
    mountLayerReadouts(root, store),
  ]);
}
