import type { SceneShell } from '@core/scene/shell';
import type { GliderStore } from '../state';
import { bindStore } from './bindings';
import { GliderController } from './gliderController';
import { LabelVisibility } from './labelVisibility';
import { warmKeyLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { SCENE_OPTIONS } from './sceneOptions';

export function mountGliderScene(shell: SceneShell, store: GliderStore): () => void {
  const restoreKeyLight = warmKeyLight(shell.lighting.key);
  const glider = new GliderController(shell);
  const labelVisibility = new LabelVisibility(shell.labels, shell.rig.camera, LABEL_PRIORITY);
  shell.viewport.onResize((size) => labelVisibility.setViewport(size));
  const unbind = bindStore(store, { glider, labelVisibility, ...shell });
  shell.onFrame(() => {
    glider.update(store.getState());
    labelVisibility.update();
  });
  return () => {
    unbind();
    glider.dispose();
    restoreKeyLight();
  };
}
