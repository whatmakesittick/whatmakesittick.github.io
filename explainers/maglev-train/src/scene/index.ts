import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { MaglevTrainStore } from '../state';
import { bindStore } from './bindings';
import { MaglevTrainController } from './controller';
import { maglevTrainLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { SCENE_OPTIONS } from './sceneOptions';

export function mountMaglevTrainScene(shell: SceneShell, store: MaglevTrainStore): () => void {
  const restoreLight = maglevTrainLight(shell.lighting);
  const train = new MaglevTrainController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => train.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { train, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    train.dispose();
    restoreLight();
  };
}
