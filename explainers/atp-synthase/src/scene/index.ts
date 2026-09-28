import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { AtpSynthaseStore } from '../state';
import { bindStore } from './bindings';
import { AtpSynthaseController } from './controller';
import { cellLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { SCENE_OPTIONS } from './sceneOptions';

export function mountAtpSynthaseScene(shell: SceneShell, store: AtpSynthaseStore): () => void {
  const restoreLight = cellLight(shell.lighting);
  const synthase = new AtpSynthaseController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => synthase.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { synthase, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    synthase.dispose();
    restoreLight();
  };
}
