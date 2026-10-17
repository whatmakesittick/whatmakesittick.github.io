import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { ThrusterCarStore } from '../state';
import { bindStore } from './bindings';
import { ThrusterCarController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

export { bindStore } from './bindings';
export type { SceneTargets } from './bindings';
export { ThrusterCarController } from './controller';
export type { ThrusterCarControllerDependencies, ViewFramer } from './controller';
export { SCENE_OPTIONS } from './sceneOptions';

export function mountThrusterCarScene(shell: SceneShell, store: ThrusterCarStore): () => void {
  const car = new ThrusterCarController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => car.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { car, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    car.dispose();
  };
}
