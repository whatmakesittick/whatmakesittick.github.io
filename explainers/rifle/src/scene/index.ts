import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneOptions, SceneShell } from '@core/scene/shell';
import type { RifleStore } from '../state';
import { bindStore } from './bindings';
import { RifleController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

const CAMERA = { near: 1, far: 20000 } as const;

export const SCENE_OPTIONS: SceneOptions = { camera: CAMERA };

export function mountRifleScene(shell: SceneShell, store: RifleStore): () => void {
  const rifle = new RifleController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => rifle.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { rifle, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    rifle.dispose();
  };
}
