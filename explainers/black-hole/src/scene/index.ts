import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { BlackHoleStore } from '../state';
import { bindStore } from './bindings';
import { BlackHoleController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

export { SCENE_OPTIONS } from './sceneOptions';

export function mountBlackHoleScene(shell: SceneShell, store: BlackHoleStore): () => void {
  const blackHole = new BlackHoleController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => blackHole.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { blackHole, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    blackHole.dispose();
  };
}
