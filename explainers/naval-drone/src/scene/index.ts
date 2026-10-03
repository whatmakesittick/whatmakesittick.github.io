import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { NavalDroneStore } from '../state';
import { bindStore } from './bindings';
import { NavalDroneController } from './controller';
import { navalDroneLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { SCENE_OPTIONS } from './sceneOptions';

export function mountNavalDroneScene(shell: SceneShell, store: NavalDroneStore): () => void {
  const restoreLight = navalDroneLight(shell.lighting);
  const navalDrone = new NavalDroneController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => navalDrone.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { navalDrone, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    navalDrone.dispose();
    restoreLight();
  };
}
