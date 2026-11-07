import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneOptions, SceneShell } from '@core/scene/shell';
import { mountSound } from '../audio/bindSound';
import type { PianoStore } from '../state';
import { THEME } from '../theme';
import { bindStore } from './bindings';
import { PianoController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

const SCENE_LIMITS = {
  cameraNear: 0.005,
  cameraFar: 40,
  cameraMinDistance: 0.06,
  cameraMaxDistance: 9,
} as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.background,
  stage: false,
  camera: {
    near: SCENE_LIMITS.cameraNear,
    far: SCENE_LIMITS.cameraFar,
    distance: { min: SCENE_LIMITS.cameraMinDistance, max: SCENE_LIMITS.cameraMaxDistance },
  },
};

export function mountPianoScene(shell: SceneShell, store: PianoStore): () => void {
  const piano = new PianoController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => piano.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { piano, labelVisibility, ...shell });
  const stopSound = mountSound(store);
  return () => {
    stopSound();
    removeFrame();
    labelVisibility.dispose();
    unbind();
    piano.dispose();
  };
}
