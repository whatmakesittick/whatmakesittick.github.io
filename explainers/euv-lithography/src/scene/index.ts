import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { EuvStore } from '../state';
import { bindStore } from './bindings';
import { EuvController } from './controller';
import { euvLithographyLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { SCENE_OPTIONS } from './sceneOptions';

export async function mountEuvScene(shell: SceneShell, store: EuvStore): Promise<() => void> {
  const restoreLight = euvLithographyLight(shell.lighting);
  const euv = new EuvController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => euv.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = await bindStore(store, { euv, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    euv.dispose();
    restoreLight();
  };
}
