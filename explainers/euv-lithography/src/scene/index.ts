import type { SceneOptions } from '@core/scene/shell';
import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneShell } from '@core/scene/shell';
import type { EuvStore } from '../state';
import { THEME } from '../theme';
import { bindStore } from './bindings';
import { HIGHLIGHT_DIM, SCENE_LIMITS } from './sceneLimits';
import { EuvController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.floor,
  stage: false,
  gaugeSide: 'right',
  camera: {
    near: SCENE_LIMITS.cameraNear,
    far: SCENE_LIMITS.cameraFar,
    maxPolarAngle: SCENE_LIMITS.maxPolarAngle,
    distance: { min: SCENE_LIMITS.cameraMinDistance, max: SCENE_LIMITS.cameraMaxDistance },
  },
  highlight: { dim: HIGHLIGHT_DIM },
};

export function mountEuvScene(shell: SceneShell, store: EuvStore): () => void {
  const euv = new EuvController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => euv.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { euv, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    euv.dispose();
  };
}
