import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneOptions, SceneShell } from '@core/scene/shell';
import type { ReaperStore } from '../state';
import { THEME } from '../theme';
import { bindStore } from './bindings';
import { ReaperController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

const FOG = { color: THEME.skyTop, near: 1500, far: 7000 } as const;
const CAMERA = {
  near: 1,
  far: 8000,
  maxPolarAngle: 0.62 * Math.PI,
  distance: { min: 4, max: 3000 },
} as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.skyTop,
  fog: FOG,
  stage: false,
  camera: CAMERA,
  gaugeSide: 'top',
};

export function mountReaperScene(shell: SceneShell, store: ReaperStore): () => void {
  const reaper = new ReaperController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => reaper.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { reaper, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    reaper.dispose();
  };
}
