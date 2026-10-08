import { createLabelVisibility } from '@core/scene/presetBinder';
import type { SceneOptions, SceneShell } from '@core/scene/shell';
import type { PartId } from '../ids';
import type { WindFarmStore } from '../state';
import { THEME } from '../theme';
import { bindStore } from './bindings';
import { WindFarmController } from './controller';
import { LABEL_PRIORITY } from './partInfo';

export { bindStore } from './bindings';
export type { SceneTargets } from './bindings';
export { WindFarmController } from './controller';
export type { ViewFramer, WindFarmControllerDependencies } from './controller';

const HAZE = { colour: THEME.haze, near: 9000, far: 28000 } as const;

const SCENE_LIMITS = {
  cameraNear: 2,
  cameraFar: 30000,
  maxPolarAngle: Math.PI * 0.47,
  cameraMinDistance: 6,
  cameraMaxDistance: 25000,
} as const;

const HIGHLIGHT_DIM = { saturation: 0.55, brightness: 0.62, emissive: 0.4 } as const;

const UNDIMMED_PARTS: readonly PartId[] = ['land', 'farmLand', 'streamlinesGroup', 'windArrows'];

export const SCENE_OPTIONS: SceneOptions = {
  background: HAZE.colour,
  fog: { color: HAZE.colour, near: HAZE.near, far: HAZE.far },
  stage: false,
  camera: {
    near: SCENE_LIMITS.cameraNear,
    far: SCENE_LIMITS.cameraFar,
    maxPolarAngle: SCENE_LIMITS.maxPolarAngle,
    distance: { min: SCENE_LIMITS.cameraMinDistance, max: SCENE_LIMITS.cameraMaxDistance },
  },
  gaugeSide: 'top',
  highlight: { dim: HIGHLIGHT_DIM, undimmed: UNDIMMED_PARTS },
};

export function mountWindFarmScene(shell: SceneShell, store: WindFarmStore): () => void {
  const windFarm = new WindFarmController(shell);
  const removeFrame = shell.onFrame((deltaSeconds) => windFarm.update(deltaSeconds));
  const labelVisibility = createLabelVisibility(shell, LABEL_PRIORITY);
  const unbind = bindStore(store, { windFarm, labelVisibility, ...shell });
  return () => {
    removeFrame();
    labelVisibility.dispose();
    unbind();
    windFarm.dispose();
  };
}
