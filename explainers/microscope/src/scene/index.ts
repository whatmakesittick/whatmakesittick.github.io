import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { MicroscopeStore } from '../state';
import { bindStore } from './bindings';
import { MicroscopeController } from './microscopeController';
import { LABEL_PRIORITY } from './partInfo';

export { SCENE_OPTIONS } from './sceneOptions';

export function mountMicroscopeScene(shell: SceneShell, store: MicroscopeStore): () => void {
  const microscope = new MicroscopeController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) =>
    microscope.update(store.getState(), deltaSeconds),
  );
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { microscope, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    microscope.dispose();
  };
}
