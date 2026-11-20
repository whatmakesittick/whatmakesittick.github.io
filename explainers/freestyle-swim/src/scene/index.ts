import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { SwimStore } from '../state';
import { bindStore } from './bindings';
import { SwimController } from './controller';
import { swimLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { bindStore } from './bindings';
export type { SceneTargets } from './bindings';
export { SwimController } from './controller';
export type { SwimControllerDependencies, ViewFramer } from './controller';

export { SCENE_OPTIONS } from './sceneOptions';

export async function mountSwimScene(shell: SceneShell, store: SwimStore): Promise<() => void> {
  const restoreLight = swimLight(shell.lighting);
  const swim = new SwimController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => swim.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = await bindStore(store, { swim, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    swim.dispose();
    restoreLight();
  };
}
