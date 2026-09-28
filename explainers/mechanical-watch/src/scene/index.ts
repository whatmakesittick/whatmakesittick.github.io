import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneOptions, SceneShell } from '@core/scene/shell';
import type { WatchStore } from '../state';
import { bindStore } from './bindings';
import { WatchController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

const GRAPHITE = '#15171b';
const CAMERA = {
  near: 0.5,
  far: 4000,
  maxPolarAngle: Math.PI * 0.5,
  distance: { min: 3, max: 1200 },
} as const;
const GENTLE_DIM = { saturation: 0.45, brightness: 0.62, emissive: 0.35 } as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: GRAPHITE,
  stage: true,
  camera: CAMERA,
  highlight: { dim: GENTLE_DIM },
};

export function mountMechanicalWatchScene(shell: SceneShell, store: WatchStore): () => void {
  const watch = new WatchController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => watch.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { watch, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    watch.dispose();
  };
}
