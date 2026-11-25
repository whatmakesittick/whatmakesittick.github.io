import { yieldToMain } from '@core/scene/pacing';
import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { RunStore } from '../state';
import { bindStore } from './bindings';
import { RunController } from './controller';
import { runLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { bindStore } from './bindings';
export type { SceneTargets } from './bindings';
export { RunController } from './controller';
export type { RunControllerDependencies, ViewFramer } from './controller';
export { SCENE_OPTIONS } from './sceneOptions';

export async function mountRunScene(shell: SceneShell, store: RunStore): Promise<() => void> {
  const restoreLight = runLight(shell.lighting);
  const run = new RunController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => run.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const release = () => {
    removeFrame();
    labelVisibility.dispose();
    run.dispose();
    restoreLight();
  };
  try {
    const unbind = await bindStore(store, { run, labelVisibility, ...shell });
    await yieldToMain();
    return () => {
      unbind();
      release();
    };
  } catch (error) {
    release();
    throw error;
  }
}
