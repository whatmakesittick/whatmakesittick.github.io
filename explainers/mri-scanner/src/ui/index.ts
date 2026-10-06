import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import type { MriScannerStore } from '../state';
import { mountGradientsReadouts } from './mountGradientsReadouts';
import { mountMagnetReadouts } from './mountMagnetReadouts';
import { mountOverviewReadouts } from './mountOverviewReadouts';
import { mountPictureReadouts } from './mountPictureReadouts';
import { mountResonanceControl } from './mountResonanceControl';
import { mountSpinsReadouts } from './mountSpinsReadouts';

export { CHAPTER_ACTIONS } from './actions';
export { MRI_SCANNER_CHOICES, VIEW_TOGGLES } from './dock';
export { MRI_SCANNER_READOUTS } from './readouts';

export function mountMriScannerUi(root: Document, store: MriScannerStore): Disposer {
  return disposeAll([
    mountOverviewReadouts(root, store),
    mountMagnetReadouts(root, store),
    mountSpinsReadouts(root, store),
    mountResonanceControl(root, store),
    mountGradientsReadouts(root, store),
    mountPictureReadouts(root, store),
  ]);
}
