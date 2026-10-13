import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { ChainsawStore } from '../state';
import { bindStore } from './bindings';
import { ChainsawController } from './controller';
import { chainsawLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { bindStore } from './bindings';
export type { SceneTargets } from './bindings';
export { ChainsawController } from './controller';
export type { ChainsawControllerDependencies, ViewFramer } from './controller';
export { SCENE_OPTIONS } from './sceneOptions';

export function mountChainsawScene(shell: SceneShell, store: ChainsawStore): () => void {
  const restoreLight = chainsawLight(shell.lighting);
  const chainsaw = new ChainsawController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => chainsaw.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { chainsaw, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    chainsaw.dispose();
    restoreLight();
  };
}
