import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { FpvStore } from '../state';
import { bindStore } from './bindings';
import { FpvController } from './controller';
import { fpvLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { SCENE_OPTIONS } from './sceneOptions';

function reportGoggles(store: FpvStore, through: boolean): void {
  const state = store.getState();
  if (state.throughGoggles !== through) state.setThroughGoggles(through);
}

export function mountFpvScene(shell: SceneShell, store: FpvStore): () => void {
  const restoreLight = fpvLight(shell.lighting);
  const drone = new FpvController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => {
    reportGoggles(store, drone.ridesTheCamera());
    return drone.update(deltaSeconds);
  });
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { drone, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    drone.dispose();
    restoreLight();
  };
}
