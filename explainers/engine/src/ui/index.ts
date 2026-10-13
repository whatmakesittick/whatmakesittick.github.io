import type { EngineStore } from '../state';
import { mountCompressionControl } from './compressionControl';
import { mountDiagrams } from './diagrams';
import { fillModelFacts } from './facts';

export { CHAPTER_ACTIONS } from './actions';
export { ENGINE_CHOICES, VIEW_TOGGLES } from './dock';
export { mountGaugeDial } from './dial';
export { ENGINE_READOUTS } from './readouts';

export function mountEngineUi(root: Document, store: EngineStore): void {
  fillModelFacts(root);
  mountCompressionControl(root, store);
  mountDiagrams(root, store);
}
