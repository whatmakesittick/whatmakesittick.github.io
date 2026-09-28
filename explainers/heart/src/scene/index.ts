import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneOptions, SceneShell } from '@core/scene/shell';
import type { PartId } from '../ids';
import type { HeartStore } from '../state';
import { bindStore } from './bindings';
import { HeartController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

const CAMERA = {
  near: 1,
  far: 2500,
  maxPolarAngle: Math.PI * 0.58,
  distance: { min: 25, max: 900 },
} as const;
const GHOST_DIM = { saturation: 0.45, brightness: 0.62, emissive: 0.35, opacity: 0.4 } as const;
const BLOOD_PARTS: readonly PartId[] = ['venousBlood', 'arterialBlood'];

export const SCENE_OPTIONS: SceneOptions = {
  stage: true,
  camera: CAMERA,
  highlight: { dim: GHOST_DIM, undimmed: BLOOD_PARTS },
};

export function mountHeartScene(shell: SceneShell, store: HeartStore): () => void {
  const heart = new HeartController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => heart.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { heart, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    heart.dispose();
  };
}
