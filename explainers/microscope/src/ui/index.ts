import type { MicroscopeStore } from '../state';
import { mountFocusControl } from './focusControl';
import { mountTotalMagnification } from './totalMagnification';
import { mountWavelengthControl } from './wavelengthControl';

export { CHAPTER_ACTIONS } from './actions';
export { MICROSCOPE_CHOICES, VIEW_TOGGLES } from './dock';
export { MICROSCOPE_READOUTS } from './readouts';

export function mountMicroscopeUi(root: Document, store: MicroscopeStore): void {
  mountTotalMagnification(root, store);
  mountWavelengthControl(root, store);
  mountFocusControl(root, store);
}
