import { UNDIMMED_GROUP } from '@core/scene/materials';
import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneOptions, SceneShell } from '@core/scene/shell';
import { THEME } from '../theme';
import type { SwimStore } from '../state';
import { bindStore } from './bindings';
import { SwimController } from './controller';
import { SCENE_LIMITS } from './constants';
import { LABEL_PRIORITY } from './partInfo';

export { bindStore } from './bindings';
export type { SceneTargets } from './bindings';
export { SwimController } from './controller';
export type { SwimControllerDependencies, ViewFramer } from './controller';

// --- SCENE_OPTIONS block: the coordinator swaps this at integration ---
export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.sceneBackground,
  fog: { color: THEME.sceneBackground, near: SCENE_LIMITS.fogNear, far: SCENE_LIMITS.fogFar },
  stage: false,
  camera: {
    near: SCENE_LIMITS.cameraNear,
    far: SCENE_LIMITS.cameraFar,
    maxPolarAngle: SCENE_LIMITS.maxPolarAngle,
    distance: { min: SCENE_LIMITS.cameraMinDistance, max: SCENE_LIMITS.cameraMaxDistance },
  },
  gaugeSide: 'top',
  highlight: { undimmed: [UNDIMMED_GROUP] },
};
// --- end SCENE_OPTIONS block ---

export async function mountSwimScene(shell: SceneShell, store: SwimStore): Promise<() => void> {
  const swim = new SwimController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => swim.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = await bindStore(store, { swim, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    swim.dispose();
  };
}
