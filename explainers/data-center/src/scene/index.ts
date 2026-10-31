import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { DataCenterStore } from '../state';
import { bindStore } from './bindings';
import { DataCenterController } from './controller';
import { dataCenterLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { SCENE_OPTIONS } from './sceneOptions';

export function mountDataCenterScene(shell: SceneShell, store: DataCenterStore): () => void {
  const restoreLight = dataCenterLight(shell.lighting);
  const dataCenter = new DataCenterController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => dataCenter.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { dataCenter, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    dataCenter.dispose();
    restoreLight();
  };
}
