import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { RifleStore } from '../state';
import { bindStore } from './bindings';
import { RifleController } from './controller';
import { rifleLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { SCENE_OPTIONS } from './sceneOptions';

export function mountRifleScene(shell: SceneShell, store: RifleStore): () => void {
  const restoreLight = rifleLight(shell.lighting);
  const rifle = new RifleController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => rifle.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { rifle, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    rifle.dispose();
    restoreLight();
  };
}
