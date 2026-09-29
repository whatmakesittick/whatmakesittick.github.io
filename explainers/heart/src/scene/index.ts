import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { HeartStore } from '../state';
import { bindStore } from './bindings';
import { HeartController } from './controller';
import { heartLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { SCENE_OPTIONS } from './sceneOptions';

export function mountHeartScene(shell: SceneShell, store: HeartStore): () => void {
  const restoreLight = heartLight(shell.lighting);
  const heart = new HeartController(shell, () => store.getState().valve);
  const removeFrame = shell.onFrame((deltaSeconds) => heart.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { heart, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    heart.dispose();
    restoreLight();
  };
}
