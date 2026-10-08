import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { WindFarmStore } from '../state';
import { bindStore } from './bindings';
import { WindFarmController } from './controller';
import { windFarmLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { bindStore } from './bindings';
export type { SceneTargets } from './bindings';
export { WindFarmController } from './controller';
export type { ViewFramer, WindFarmControllerDependencies } from './controller';

export { SCENE_OPTIONS } from './sceneOptions';

export function mountWindFarmScene(shell: SceneShell, store: WindFarmStore): () => void {
  const restoreLight = windFarmLight(shell.lighting);
  const windFarm = new WindFarmController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => windFarm.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { windFarm, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    windFarm.dispose();
    restoreLight();
  };
}
