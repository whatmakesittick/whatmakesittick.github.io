import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { ClockStore } from '../state';
import { bindStore } from './bindings';
import { ClockController } from './controller';
import { iodineClockLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { bindStore } from './bindings';
export type { SceneTargets } from './bindings';
export { ClockController } from './controller';
export type { ClockControllerDependencies, ViewFramer } from './controller';
export { SCENE_OPTIONS } from './sceneOptions';

export function mountIodineClockScene(shell: SceneShell, store: ClockStore): () => void {
  const restoreLight = iodineClockLight(shell.lighting);
  const clock = new ClockController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => clock.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { clock, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    clock.dispose();
    restoreLight();
  };
}
