import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { ReaperStore } from '../state';
import { bindStore } from './bindings';
import { ReaperController } from './controller';
import { reaperLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { SCENE_OPTIONS } from './sceneOptions';

export async function mountReaperScene(shell: SceneShell, store: ReaperStore): Promise<() => void> {
  const restoreLight = reaperLight(shell.lighting);
  const reaper = new ReaperController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => reaper.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = await bindStore(store, { reaper, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    reaper.dispose();
    restoreLight();
  };
}
