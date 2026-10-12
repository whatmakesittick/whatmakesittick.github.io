import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneOptions, SceneShell } from '@core/scene/shell';
import type { ChainsawStore } from '../state';
import { bindStore } from './bindings';
import { ChainsawController } from './controller';
import { SCENE_LIMITS, SEE_THROUGH_DIM } from './constants';
import { LABEL_PRIORITY, UNDIMMED_PARTS } from './partInfo';

export { bindStore } from './bindings';
export type { SceneTargets } from './bindings';
export { ChainsawController } from './controller';
export type { ChainsawControllerDependencies, ViewFramer } from './controller';

export const SCENE_OPTIONS: SceneOptions = {
  camera: {
    near: SCENE_LIMITS.cameraNear,
    far: SCENE_LIMITS.cameraFar,
    distance: { min: SCENE_LIMITS.cameraMinDistance, max: SCENE_LIMITS.cameraMaxDistance },
  },
  gaugeSide: 'top',
  highlight: { dim: SEE_THROUGH_DIM, undimmed: UNDIMMED_PARTS },
};

export function mountChainsawScene(shell: SceneShell, store: ChainsawStore): () => void {
  const chainsaw = new ChainsawController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => chainsaw.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { chainsaw, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    chainsaw.dispose();
  };
}
