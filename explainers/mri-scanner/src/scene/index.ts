import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { MriScannerStore } from '../state';
import { bindStore } from './bindings';
import { MriScannerController } from './controller';
import { mriScannerLight } from './lighting';
import { LABEL_PRIORITY } from './partInfo';

export { bindStore } from './bindings';
export type { SceneTargets } from './bindings';
export { MriScannerController } from './controller';
export type { MriScannerControllerDependencies, ViewFramer } from './controller';
export { SCENE_OPTIONS } from './sceneOptions';

export function mountMriScannerScene(shell: SceneShell, store: MriScannerStore): () => void {
  const restoreLight = mriScannerLight(shell.lighting);
  const mriScanner = new MriScannerController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => mriScanner.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { mriScanner, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    mriScanner.dispose();
    restoreLight();
  };
}
