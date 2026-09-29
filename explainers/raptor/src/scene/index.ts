import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { RaptorStore } from '../state';
import { bindStore } from './bindings';
import { RaptorController } from './controller';
import { raptorLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { SCENE_OPTIONS } from './sceneOptions';

export function mountRaptorScene(shell: SceneShell, store: RaptorStore): () => void {
  const restoreLight = raptorLight(shell.lighting);
  const raptor = new RaptorController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => raptor.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { raptor, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    raptor.dispose();
    restoreLight();
  };
}
