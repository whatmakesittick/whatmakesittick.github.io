import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneOptions, SceneShell } from '@core/scene/shell';
import type { PartId } from '../ids';
import { SCENE_BOUNDS } from '../model';
import type { FpvStore } from '../state';
import { THEME } from '../theme';
import { bindStore } from './bindings';
import { FpvController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

const UNDIMMED: readonly PartId[] = ['controlLink', 'videoLink', 'spinArrows'];
const HAZE = { near: 300, far: 1600 } as const;
const SCENE_SPAN = SCENE_BOUNDS.x[1] - SCENE_BOUNDS.x[0];
const CAMERA_LIMITS = {
  near: 0.1,
  far: 4000,
  minDistance: 2,
  maxDistance: 1.5 * SCENE_SPAN,
  maxPolarAngle: Math.PI * 0.86,
} as const;
const HIGHLIGHT_DIM = { saturation: 0.55, brightness: 0.62, emissive: 0.45 } as const;

export const SCENE_OPTIONS: SceneOptions = {
  background: THEME.skyHorizon,
  fog: { color: THEME.skyHorizon, near: HAZE.near, far: HAZE.far },
  stage: false,
  camera: {
    near: CAMERA_LIMITS.near,
    far: CAMERA_LIMITS.far,
    maxPolarAngle: CAMERA_LIMITS.maxPolarAngle,
    distance: { min: CAMERA_LIMITS.minDistance, max: CAMERA_LIMITS.maxDistance },
  },
  gaugeSide: 'top',
  highlight: { dim: HIGHLIGHT_DIM, undimmed: UNDIMMED },
};

export function mountFpvScene(shell: SceneShell, store: FpvStore): () => void {
  const restoreLight = (): void => {};
  const drone = new FpvController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => drone.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { drone, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    drone.dispose();
    restoreLight();
  };
}
