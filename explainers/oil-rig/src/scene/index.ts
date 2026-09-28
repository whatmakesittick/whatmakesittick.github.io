import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { OilRigStore } from '../state';
import { bindStore } from './bindings';
import { OilRigController } from './controller';
import { seaLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { SCENE_OPTIONS } from './sceneOptions';

export function mountOilRigScene(shell: SceneShell, store: OilRigStore): () => void {
  const restoreLight = seaLight(shell.lighting);
  const oilRig = new OilRigController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => oilRig.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { oilRig, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    oilRig.dispose();
    restoreLight();
  };
}
