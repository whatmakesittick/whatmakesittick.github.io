import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { GliderStore } from '../state';
import { bindStore } from './bindings';
import { GliderController } from './gliderController';
import { warmKeyLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { SCENE_OPTIONS } from './sceneOptions';

export function mountGliderScene(shell: SceneShell, store: GliderStore): () => void {
  const restoreKeyLight = warmKeyLight(shell.lighting.key);
  const glider = new GliderController(shell);
  const removeFrame = shell.onFrame(() => glider.update(store.getState()));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { glider, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    glider.dispose();
    restoreKeyLight();
  };
}
