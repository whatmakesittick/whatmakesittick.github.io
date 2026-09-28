import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { WatchStore } from '../state';
import { bindStore } from './bindings';
import { WatchController } from './controller';
import { benchLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { SCENE_OPTIONS } from './sceneOptions';

export function mountMechanicalWatchScene(shell: SceneShell, store: WatchStore): () => void {
  const restoreLight = benchLight(shell.lighting);
  const watch = new WatchController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => watch.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { watch, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    watch.dispose();
    restoreLight();
  };
}
