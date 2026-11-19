import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { FlavorStore } from '../state';
import { bindStore } from './bindings';
import { FlavorController } from './controller';
import { cherryFlavorLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { bindStore } from './bindings';
export type { SceneTargets } from './bindings';
export { FlavorController } from './controller';
export type { FlavorControllerDependencies, ViewFramer } from './controller';

export { SCENE_OPTIONS, UNDIMMED_PARTS } from './sceneOptions';

export async function mountCherryFlavorScene(
  shell: SceneShell,
  store: FlavorStore,
): Promise<() => void> {
  const restoreLight = cherryFlavorLight(shell.lighting);
  const flavor = new FlavorController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => flavor.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = await bindStore(store, { flavor, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    flavor.dispose();
    restoreLight();
  };
}
