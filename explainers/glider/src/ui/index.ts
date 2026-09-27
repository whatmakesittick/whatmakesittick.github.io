import type { GliderStore } from '../state';
import { mountCloudControl } from './cloudControl';
import { mountPolarControl } from './polarControl';

export { CHAPTER_ACTIONS } from './actions';
export { GLIDER_CHOICES, VIEW_TOGGLES } from './dock';
export { GLIDER_READOUTS } from './readouts';

export function mountGliderUi(root: Document, store: GliderStore): void {
  mountPolarControl(root, store);
  mountCloudControl(root, store);
}
