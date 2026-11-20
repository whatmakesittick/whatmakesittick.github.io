import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { EngineStore } from '../state';
import { bindStore } from './bindings';
import { EngineController } from './controller';
import { ge9xLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { bindStore } from './bindings';
export type { SceneTargets } from './bindings';
export { EngineController } from './controller';
export type { EngineControllerDependencies, ViewFramer } from './controller';

export { SCENE_OPTIONS, UNDIMMED_PARTS } from './sceneOptions';

export async function mountEngineScene(shell: SceneShell, store: EngineStore): Promise<() => void> {
  const restoreLight = ge9xLight(shell.lighting);
  const engine = new EngineController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => engine.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = await bindStore(store, { engine, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    engine.dispose();
    restoreLight();
  };
}
